use std::collections::{HashMap, HashSet};
use std::env;
use std::time::Duration;

use deadpool_postgres::tokio_postgres::Row;
use rust_shared::once_cell::sync::{Lazy, OnceCell};
use rust_shared::hyper::{Request, Body, Method};
use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use oauth2::{PkceCodeChallenge, RevocationUrl, RedirectUrl, TokenUrl, AuthUrl, Scope, CsrfToken, ClientSecret, ClientId, AuthorizationCode, StandardRevocableToken};
use oauth2::TokenResponse;
use rust_shared::anyhow::{Context, anyhow, Error};
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use futures_util::{Stream, TryStreamExt};
use rust_shared::axum::response::IntoResponse;
use rust_shared::axum::{Router, response};
use rust_shared::axum::extract::{Extension, Path};
use rust_shared::axum::routing::get;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::utils::auth::jwt_utils_base::{get_or_create_jwt_key_hs256, UserJWTData};
use rust_shared::utils::db::uuid::{new_uuid_v4_as_b64, new_uuid_v4_as_b64_id};
use rust_shared::db_constants::SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME;
use rust_shared::utils::futures::make_reliable;
use rust_shared::utils::general::get_uri_params;
use rust_shared::indoc::indoc;
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::utils::_k8s::{get_or_create_k8s_secret};
use rust_shared::{async_graphql, serde_json, SubError, to_sub_err, to_sub_err_in_stream, to_anyhow};
use tracing::{info, error, warn};
use rust_shared::jwt_simple::prelude::{HS256Key, Claims, MACLike, VerificationOptions};

use crate::db::_general::GenericMutation_Result;
use crate::db::general::sign_in::get_err_auth_data_required;
use crate::db::general::sign_in_::fake_user::username_to_fake_user_data;
use crate::db::access_policies::{get_access_policy, get_system_access_policy};
use crate::db::commands::_command::set_db_entry_by_id_for_struct;
use crate::db::general::subtree_collector::params;
use crate::db::user_hiddens::{UserHidden, get_user_hiddens, get_user_hidden};
use crate::db::users::{get_user, User, PermissionGroups};
use crate::gql::GQLDataFromHTTPRequest;
use crate::store::storage::{AppStateArc, SignInMsg};
use crate::utils::db::accessors::{AccessorContext, get_db_entries};
use crate::utils::db::agql_ext::gql_request_storage::GQLRequestStorage;
use crate::utils::general::data_anchor::DataAnchorFor1;
use crate::utils::general::general::{body_to_str};
use crate::utils::type_aliases::{ABSender};

// for user-jwt-data + user-info retrieved from database
// ==========

pub async fn get_user_info_from_gql_ctx<'a>(gql_ctx: &'a async_graphql::Context<'a>, ctx: &AccessorContext<'_>) -> Result<User, Error> {
    let user_info = try_get_user_info_from_gql_ctx(gql_ctx, ctx).await?;
    match user_info {
        None => Err(get_err_auth_data_required()),
        Some(user_info) => Ok(user_info),
    }
}
pub async fn try_get_user_info_from_gql_ctx<'a>(gql_ctx: &'a async_graphql::Context<'a>, ctx: &AccessorContext<'_>) -> Result<Option<User>, Error> {
    match try_get_user_jwt_data_from_gql_ctx(gql_ctx).await? {
        None => Ok(None),
        Some(jwt_data) => {
            let user_info = resolve_jwt_to_user_info(ctx, &jwt_data).await?;
            Ok(Some(user_info))
        }
    }
}
pub async fn resolve_jwt_to_user_info<'a>(ctx: &AccessorContext<'_>, jwt_data: &UserJWTData) -> Result<User, Error> {
    /*let user_hidden = get_user_hidden(&ctx, jwt_data.id.as_str()).await?;
    let user = get_user(&ctx, &user_hidden.id).await?;*/
    let user = get_user(&ctx, jwt_data.id.as_str()).await?;
    Ok(user)
}

// for user-jwt-data only (ie. static data stored within jwt itself, without need for new db queries)
// ==========

pub async fn get_user_jwt_data_from_gql_ctx<'a>(gql_ctx: &'a async_graphql::Context<'a>) -> Result<UserJWTData, Error> {
    let jwt_data = try_get_user_jwt_data_from_gql_ctx(gql_ctx).await?;
    match jwt_data {
        None => Err(get_err_auth_data_required()),
        Some(user_info) => Ok(user_info),
    }
}
pub async fn try_get_user_jwt_data_from_gql_ctx<'a>(gql_ctx: &'a async_graphql::Context<'a>) -> Result<Option<UserJWTData>, Error> {
    // this branch is used for GET/POST requests (ie. for queries and mutations; it's populated in `have_own_graphql_handle_request()`)
    if let Ok(data) = gql_ctx.data::<GQLDataFromHTTPRequest>() && let Some(jwt) = &data.jwt {
        let jwt_data = resolve_and_verify_jwt_string(&jwt).await?;
        Ok(Some(jwt_data))
    }
    // this branch is used for websocket requests (ie. for subscriptions); it's inserted in `graphql_websocket_handler()` and populated in `signInAttach()`
    else if let Ok(storage) = gql_ctx.data::<GQLRequestStorage>() && let Some(jwt_data) = storage.jwt.read().await.clone() {
        Ok(Some(jwt_data))
    }
    // if no data-entry found in gql-context, return None for "no user data"
    else {
        Ok(None)
    }
}
pub async fn resolve_and_verify_jwt_string<'a>(jwt_string: &str) -> Result<UserJWTData, Error> {
    let key = get_or_create_jwt_key_hs256().await?;

    let verify_opts = VerificationOptions {
        //accept_future: true, // accept tokens that will only be valid in the future
        //time_tolerance: Some(JWTDuration::from_mins(15)), // accept tokens even if they have expired up to 15 minutes after the deadline
        //max_validity: Some(JWTDuration::from_hours(1)), // reject tokens if they were issued more than 1 hour ago
        //allowed_issuers: Some(HashSet::from_strings(&["example app"])), // reject tokens if they don't include an issuer from that set
        .. VerificationOptions::default()
    };
    let claims = key.verify_token::<UserJWTData>(jwt_string, Some(verify_opts))?;
    let jwt_data: UserJWTData = claims.custom;
    Ok(jwt_data)
}

// other gql-context data
// ==========

pub fn try_get_referrer_from_gql_ctx<'a>(gql_ctx: &'a async_graphql::Context<'a>) -> Option<String> {
    match gql_ctx.data::<GQLDataFromHTTPRequest>() {
        Ok(val) => val.referrer.clone(),
        // if no data-entry found in gql-context, return None for "no user data"
        Err(_err) => None,
    }
}