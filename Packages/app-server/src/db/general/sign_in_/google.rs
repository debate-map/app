use std::collections::{HashMap, HashSet};
use std::env;
use std::time::Duration;

use deadpool_postgres::tokio_postgres::Row;
use rust_shared::once_cell::sync::{Lazy, OnceCell};
use rust_shared::hyper::{Request};
use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use oauth2::{PkceCodeChallenge, RevocationUrl, RedirectUrl, TokenUrl, AuthUrl, Scope, CsrfToken, ClientSecret, ClientId, AuthorizationCode, StandardRevocableToken};
use oauth2::TokenResponse;
use rust_shared::anyhow::{Context, anyhow, Error, bail};
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use futures_util::{Stream, TryStreamExt};
use rust_shared::axum::response::IntoResponse;
use rust_shared::axum::{Router, Extension, response};
use rust_shared::axum::extract::{Path};
use rust_shared::axum::routing::get;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::utils::auth::jwt_utils_base::UserJWTData;
use rust_shared::utils::db::uuid::{new_uuid_v4_as_b64, new_uuid_v4_as_b64_id};
use rust_shared::db_constants::{SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME, SYSTEM_POLICY_PRIVATE_GOVERNED_NAME};
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
use crate::db::general::sign_in_::fake_user::username_to_fake_user_data;
use crate::db::access_policies::{get_access_policy, get_system_access_policy};
use crate::db::commands::_command::upsert_db_entry_by_id_for_struct;
use crate::db::general::subtree_collector::params;
use crate::db::user_hiddens::{UserHidden, get_user_hiddens, get_user_hidden, UserHidden_Extras};
use crate::db::users::{get_user, User, PermissionGroups};
use crate::store::storage::{AppStateArc, SignInMsg};
use crate::utils::db::accessors::{AccessorContext, get_db_entries};
use crate::utils::general::data_anchor::DataAnchorFor1;
use crate::utils::type_aliases::{ABSender};

/// See list of available fields here: https://developers.google.com/identity/openid-connect/openid-connect
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GoogleUserInfoResult {
    /// Identifier for the user that is unique/unchanging, and always provided in the oauth response.
    pub sub: String,
    pub email: Option<String>,
    pub email_verified: Option<bool>,
    pub name: Option<String>,
    pub given_name: Option<String>,
    pub family_name: Option<String>,
    pub locale: Option<String>,
    pub picture: Option<String>,
}

pub async fn store_user_data_for_google_sign_in(profile: GoogleUserInfoResult, ctx: &AccessorContext<'_>, read_only: bool, force_as_admin: bool) -> Result<UserJWTData, Error> {
    let email = match &profile.email {
        Some(email) => email.clone(),
        None => bail!("Cannot sign-in using a Google account with no email address."),
    };
    let name = match &profile.name {
        Some(name) => name.clone(),
        None => bail!("Cannot sign-in using a Google account with no name."),
    };
    
    let user_hiddens_with_email = get_user_hiddens(ctx, Some(email.clone())).await?;
    match user_hiddens_with_email.len() {
        0 => {},
        1 => {
            let existing_user_hidden = user_hiddens_with_email.get(0).ok_or(anyhow!("Row missing somehow?"))?;
            info!("Found existing user for email:{}", email);
            let existing_user = get_user(ctx, &existing_user_hidden.id).await
                .map_err(|_| anyhow!(r#"Could not find user with id matching that of the entry in userHiddens ({}), which was found based on your provided account's email ({})."#, existing_user_hidden.id.as_str(), existing_user_hidden.email))?;
            info!("Also found user-data:{:?}", existing_user);
            return Ok(UserJWTData { id: existing_user.id.0, email: existing_user_hidden.email.to_owned(), readOnly: Some(read_only) });
        },
        _ => return Err(anyhow!("More than one user found with same email! This shouldn't happen.")),
    }

	info!(r#"User not found for email "{}". Creating new."#, email);

	let mut permissionGroups = PermissionGroups {basic: true, verified: true, r#mod: false, admin: false};

	// maybe temp; make first (non-system) user an admin
    let users_count_rows: Vec<Row> = ctx.tx.query_raw("SELECT count(*) FROM (SELECT 1 FROM users LIMIT 10) t;", params(&[])).await?.try_collect().await?;
    let users_count: i64 = users_count_rows.get(0).ok_or(anyhow!("No rows"))?.try_get(0)?;
	if users_count <= 1 || force_as_admin {
		info!("Marking new user as admin. (since first non-system user signing in, or using dev-mode sign-in path)");
		permissionGroups.r#mod = true;
        permissionGroups.admin = true;
	}

    let profile_clone = profile.clone();
	let user = User {
        id: new_uuid_v4_as_b64_id(),
		displayName: name,
		permissionGroups,
		photoURL: profile.picture,
        joinDate: time_since_epoch_ms_i64(),
        edits: 0,
        lastEditAt: None,
	};
    let new_user_id = user.id.as_str().to_owned();
	let policy_public_ungoverned = get_system_access_policy(ctx, &SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME).await?;
	let policy_private_governed = get_system_access_policy(ctx, &SYSTEM_POLICY_PRIVATE_GOVERNED_NAME).await?;
	let user_hidden = UserHidden {
        id: user.id.clone(),
		email: email,
		providerData: serde_json::to_value(vec![profile_clone])?,
		lastAccessPolicy: Some(policy_public_ungoverned.id.as_str().to_owned()),
        backgroundID: None,
        backgroundCustom_enabled: None,
        backgroundCustom_color: None,
        backgroundCustom_url: None,
        backgroundCustom_position: None,
        addToStream: true,
        extras: serde_json::to_value(UserHidden_Extras {
            defaultAccessPolicy_nodeRatings: Some(policy_private_governed.id.as_str().to_owned()),
            userFollows: None,
        })?,
	};

    upsert_db_entry_by_id_for_struct(&ctx, "users".to_owned(), user.id.to_string(), user).await?;
    upsert_db_entry_by_id_for_struct(&ctx, "userHiddens".to_owned(), user_hidden.id.to_string(), user_hidden.clone()).await?;
	info!("Creation of new user semi-complete! NewID:{}", new_user_id); // "semi" complete, because transaction hasn't been committed yet

    let user = get_user(ctx, new_user_id.as_str()).await?;
	info!("User data:{:?}", user);

	Ok(UserJWTData { id: user.id.0, email: user_hidden.email.to_owned(), readOnly: Some(read_only) })
}