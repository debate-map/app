use crate::{
	get_db_entries, get_err_auth_data_required, get_or_create_jwt_key_hs256, get_or_create_k8s_secret, get_uri_params, get_user, get_user_hidden, get_user_hiddens, make_reliable, new_uuid_v4_as_b64, new_uuid_v4_as_b64_id, params, time_since_epoch_ms_i64, upsert_db_entry_by_id_for_struct,
	username_to_fake_user_data, AccessorContext, AppStateArc, AxumBody, DataAnchorFor1, GQLRequestStorage, JSONValue, PermissionGroups, SignInMsg, User, UserHidden, UserJWTData,
};
use anyhow::{anyhow, bail, Context, Error};
use async_graphql::{async_stream, scalar, EmptySubscription, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use axum::extract::{Extension, Path};
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{response, Router};
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
use serde_json::json;
use std::collections::{HashMap, HashSet};
use std::env;
use std::time::Duration;
use tracing::{error, info, warn};

pub fn get_gql_data_from_http_request(req: &Request<AxumBody>) -> Result<GQLDataFromHTTPRequest, Error> {
	let mut data = GQLDataFromHTTPRequest { jwt: None, referrer: None };
	if let Some(header) = req.headers().get("authorization") {
		//info!("Found authorization header:{}", header.to_str()?);
		if let Some(parts) = header.to_str()?.split_once("Bearer ") {
			//info!("Found bearer part2/jwt-string:{}", parts.1.to_owned());
			data.jwt = Some(parts.1.to_owned());
		} else {
			bail!("An \"authorization\" header was present, but its value was unable to be parsed. @header_value:\"{}\"", header.to_str()?);
		}
	}

	if let Some(header) = req.headers().get("referrer") {
		//info!("Found referrer header.");
		if let Ok(referrer) = header.to_str() {
			//info!("Found referrer part2:{}", referrer);
			data.referrer = Some(referrer.to_owned());
		}
	}
	Ok(data)
}

pub struct GQLDataFromHTTPRequest {
	pub jwt: Option<String>,
	pub referrer: Option<String>,
}

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
		},
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
	if let Ok(data) = gql_ctx.data::<GQLDataFromHTTPRequest>()
		&& let Some(jwt) = &data.jwt
	{
		let jwt_data = resolve_and_verify_jwt_string(&jwt).await?;
		Ok(Some(jwt_data))
	}
	// this branch is used for websocket requests (ie. for subscriptions); it's inserted in `graphql_websocket_handler()` and populated in `signInAttach()`
	else if let Ok(storage) = gql_ctx.data::<GQLRequestStorage>()
		&& let Some(jwt_data) = storage.jwt.read().await.clone()
	{
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
		..VerificationOptions::default()
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
