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
use rust_shared::axum::{Router, AddExtensionLayer, response};
use rust_shared::axum::extract::{Extension, Path};
use rust_shared::axum::routing::get;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
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
use jwt_simple::prelude::{HS256Key, Claims, MACLike, VerificationOptions};

use crate::db::_general::GenericMutation_Result;
use crate::db::general::sign_in::fake_user::username_to_fake_user_data;
use crate::db::access_policies::{get_access_policy, get_system_access_policy};
use crate::db::commands::_command::set_db_entry_by_id_for_struct;
use crate::db::general::subtree_collector::params;
use crate::db::user_hiddens::{UserHidden, get_user_hiddens, get_user_hidden};
use crate::db::users::{get_user, User, PermissionGroups};
use crate::links::proxy_to_asjs::HyperClient;
use crate::store::storage::{AppStateWrapper, SignInMsg};
use crate::utils::db::accessors::{AccessorContext, get_db_entries};
use crate::utils::general::data_anchor::DataAnchorFor1;
use crate::utils::general::general::{body_to_str};
use crate::utils::type_aliases::{ABSender, JWTDuration};

/// Rather than baking the permissions and such into the jwt, we store only the id and email (which are unchanging fields).
/// We later use that minimal info to retrieve the full user-data from the database. (this way it's up-to-date if the user's username, permissions, etc. change)
#[derive(Serialize, Deserialize)]
pub struct UserInfoForJWT {
    pub id: String,
    pub email: String,
}

pub async fn get_or_create_jwt_key_hs256() -> Result<HS256Key, Error> {
    let key_str = get_or_create_jwt_key_hs256_str().await?;
    let key_str_bytes = base64::decode(key_str)?;
    let key = HS256Key::from_bytes(&key_str_bytes);
    Ok(key)
}
static JWT_KEY_HS256_STR: OnceCell<String> = OnceCell::new();
/// Retrieves and/or creates the hs256 secret-key for use in generating JWTs.
/// Why do retrieval manually rather than having k8s import it as an environment-variable at startup?
/// Because k8s converts the base64 string into a utf8 string, which makes conversion complicated. (we want to decode it simply as a raw byte-array, for passing to HS256Key::from_bytes)
pub async fn get_or_create_jwt_key_hs256_str() -> Result<String, Error> {
    // first, try to read the key from a global variable (in case this func has already been run)
    if let Some(key_as_base64_str) = JWT_KEY_HS256_STR.get() {
        //info!("Retrieved secret key from global-var:{:?}", key_as_base64_str);
        return Ok(key_as_base64_str.to_owned());
    }
    
    // create a new key, and try to store it as a k8s secret
    let new_secret_data_if_missing = json!({
        "key": base64::encode(HS256Key::generate().to_bytes()),
    });
    let secret = get_or_create_k8s_secret("dm-jwt-secret-hs256".to_owned(), new_secret_data_if_missing).await?;
    let key_as_base64_str = secret.data["key"].as_str().ok_or(anyhow!("The \"key\" field is missing!"))?;
    //info!("Read/created secret key through k8s api:{:?}", key_as_base64_str);

    // now that we have the key, store it in global-var for faster retrieval (use get_or_init for safe handling in case this func was called by two threads concurrently)
    let result = JWT_KEY_HS256_STR.get_or_init(|| key_as_base64_str.to_owned());
    
    //Ok(key_as_base64_str.to_owned())
    Ok(result.to_owned())
}

pub async fn get_user_info_from_gql_ctx<'a>(gql_ctx: &'a async_graphql::Context<'a>, ctx: &AccessorContext<'_>) -> Result<User, Error> {
    let user_info = try_get_user_info_from_gql_ctx(gql_ctx, ctx).await?;
    match user_info {
        None => Err(anyhow!(indoc!{"
            This endpoint requires auth-data to be supplied!
            For website browsing, this means signing-in using the panel at the top-right.
            For direct requests to the graphql api, this means obtaining auth-data manually (see the \"signInStart\" endpoint at \"http://debates.app/gql-playground\"), and attaching it to your commands/requests.
            Specifically, your http requests should have an \"authorization\" header, with contents matching: \"Bearer <jwt string here>\"
        "})),
        Some(user_info) => Ok(user_info),
    }
}
pub async fn try_get_user_info_from_gql_ctx<'a>(gql_ctx: &'a async_graphql::Context<'a>, ctx: &AccessorContext<'_>) -> Result<Option<User>, Error> {
    let jwt = match gql_ctx.data::<String>() {
        Ok(val) => val,
        // if no data-entry found in gql-context, return None for "no user data"
        Err(_err) => return Ok(None),
    };
    let user_info = resolve_jwt_to_user_info(ctx, jwt).await?;
    Ok(Some(user_info))
}
pub async fn resolve_jwt_to_user_info<'a>(ctx: &AccessorContext<'_>, jwt: &str) -> Result<User, Error> {
    let key = get_or_create_jwt_key_hs256().await?;

    let verify_opts = VerificationOptions {
        //accept_future: true, // accept tokens that will only be valid in the future
        //time_tolerance: Some(JWTDuration::from_mins(15)), // accept tokens even if they have expired up to 15 minutes after the deadline
        //max_validity: Some(JWTDuration::from_hours(1)), // reject tokens if they were issued more than 1 hour ago
        //allowed_issuers: Some(HashSet::from_strings(&["example app"])), // reject tokens if they don't include an issuer from that set
        .. VerificationOptions::default()
    };
    let claims = key.verify_token::<UserInfoForJWT>(jwt, Some(verify_opts))?;
    let user_info: UserInfoForJWT = claims.custom;

    let user_hidden = get_user_hidden(&ctx, user_info.id.as_str()).await?;
    let user = get_user(&ctx, &user_hidden.id).await?;
    
    Ok(user)
}