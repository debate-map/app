use crate::{
	get_db_entries, get_user, get_user_hidden, get_user_hiddens, new_uuid_v4_as_b64, new_uuid_v4_as_b64_id, params, time_since_epoch_ms_i64, upsert_db_entry_by_id_for_struct, username_to_fake_user_data, AccessorContext, AppStateArc, JSONValue, PermissionGroups, SignInMsg, User,
	UserHidden, UserJWTData,
};
use anyhow::{anyhow, bail, Context, Error};
use async_graphql::{async_stream, scalar, EmptySubscription, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use axum::extract::Path;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{response, Extension, Router};
use deadpool_postgres::tokio_postgres::Row;
use futures_util::{Stream, TryStreamExt};
use hyper::Request;
use indoc::indoc;
use jwt_simple::prelude::{Claims, HS256Key, MACLike, VerificationOptions};
use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use oauth2::TokenResponse;
use oauth2::{AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, PkceCodeChallenge, RedirectUrl, RevocationUrl, Scope, StandardRevocableToken, TokenUrl};
use once_cell::sync::{Lazy, OnceCell};
use rust_macros::wrap_slow_macros;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map};
use std::collections::{HashMap, HashSet};
use std::env;
use std::time::Duration;
use tracing::{error, info, warn};

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
			let existing_user = get_user(ctx, &existing_user_hidden.id)
				.await
				.map_err(|_| anyhow!(r#"Could not find user with id matching that of the entry in user_hiddens ({}), which was found based on your provided account's email ({})."#, existing_user_hidden.id.as_str(), existing_user_hidden.email))?;
			info!("Also found user-data:{:?}", existing_user);
			return Ok(UserJWTData { id: existing_user.id.0, email: existing_user_hidden.email.to_owned(), readOnly: Some(read_only) });
		},
		_ => return Err(anyhow!("More than one user found with same email! This shouldn't happen.")),
	}

	info!(r#"User not found for email "{}". Creating new."#, email);

	let mut permissionGroups = PermissionGroups { basic: true, verified: true, r#mod: false, admin: false };

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
		/*edits: 0,
		lastEditAt: None,*/
		extras: JSONValue::Object(Map::new()),
	};
	let new_user_id = user.id.as_str().to_owned();
	let user_hidden = UserHidden { id: user.id.clone(), email, providerData: serde_json::to_value(vec![profile_clone])?, extras: JSONValue::Object(Map::new()) };

	upsert_db_entry_by_id_for_struct(&ctx, "users".to_owned(), user.id.to_string(), user).await?;
	upsert_db_entry_by_id_for_struct(&ctx, "user_hiddens".to_owned(), user_hidden.id.to_string(), user_hidden.clone()).await?;
	info!("Creation of new user semi-complete! NewID:{}", new_user_id); // "semi" complete, because transaction hasn't been committed yet

	let user = get_user(ctx, new_user_id.as_str()).await?;
	info!("User data:{:?}", user);

	Ok(UserJWTData { id: user.id.0, email: user_hidden.email.to_owned(), readOnly: Some(read_only) })
}
