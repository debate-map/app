use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt};
use rust_shared::anyhow::{anyhow, ensure, Context, Error};
use rust_shared::async_graphql::{async_stream, scalar, EmptySubscription, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::indoc::indoc;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::Client;
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{async_graphql, serde_json, to_sub_err, GQLError, SubError};
use std::env;
use std::path::Path;
use std::{pin::Pin, task::Poll, time::Duration};
use tracing::{error, info, warn};

use crate::utils::db::agql_ext::gql_request_storage::GQLRequestStorage;

use super::commands::add_term::AddTermResult;
use super::commands::refresh_lq_data::refresh_lq_data;
use super::general::sign_in_::jwt_utils::{get_user_jwt_data_from_gql_ctx, resolve_and_verify_jwt_string};

/// Wrapper around `ensure!` macro, which makes it easily usable in functions that return `Result<?, GQLError>`.
pub fn ensure_gql(passed: bool, error_message: impl AsRef<str>) -> Result<(), Error> {
	ensure!(passed, "{}", error_message.as_ref());
	Ok(())
}

pub fn trusted_operator_passkey_is_correct(passkey: String, log_message_if_wrong: bool) -> bool {
	let Ok(stored_passkey) = env::var("TRUSTED_OPERATOR_PASSKEY") else {
		error!(indoc! {r#"
            The debate-map-trusted-operator secret/passkey does not exist, or is invalid!
            This endpoint cannot be used until an admin fixes/creates that secret.
            K8s path for secret: namespace "default", name "debate-map-trusted-provider", field "passkey", value any utf8 string
        "#});
		return false;
	};
	let result = passkey == stored_passkey;
	if !result && log_message_if_wrong {
		error!("Trusted-operator passkey is incorrect! Submitted:{}", passkey);
	}
	return result;
}
pub fn ensure_trusted_operator_passkey_is_correct(passkey: String, log_message_if_wrong: bool) -> Result<(), Error> {
	if !trusted_operator_passkey_is_correct(passkey, log_message_if_wrong) {
		return Err(anyhow!("Trusted-operator passkey is incorrect!"));
	}
	Ok(())
}

#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct QueryPaginationResult<T: OutputType> {
	pub data: Vec<T>,
	pub total_count: i64,
}

wrap_slow_macros! {

// queries
// ==========

#[derive(Default)]
pub struct QueryShard_General;
#[Object]
impl QueryShard_General {
	// useful for testing monitor-tool's logs page
	async fn print_empty_log(&self) -> &str {
		info!("print_empty_log called");
		warn!("Test2");
		error!("Test3");
		""
	}
}

// Do not Add SimpleObject to this struct, as it's not meant to be directly exposed to the API.
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryPaginationFilter {
	pub limit: Option<i64>,
	pub after: Option<i64>,
	pub order_by: Option<String>,
	pub order_desc: Option<bool>,
}



// mutations
// ==========

#[derive(Default)] pub struct MutationShard_General;
#[Object] impl MutationShard_General {
	async fn refreshLQData(&self, ctx: &async_graphql::Context<'_>, payload: JSONValue) -> Result<GenericMutation_Result, GQLError> {
		let result = refresh_lq_data(ctx, payload).await?;
		Ok(result)
	}
}
#[derive(SimpleObject)]
pub struct GenericMutation_Result {
	pub message: String,
}

// subscriptions
// ==========

#[derive(InputObject, Serialize, Deserialize)]
pub struct LinkPreserverInput {
	pub updateInterval: u64,
}

#[derive(SimpleObject)]
struct LinkPreserverResult {
	alive: bool,
	// probably move effects like this (unrelated to link-preserving) into a separate subscription eventually
	pageRefreshRequested: bool,
}

#[derive(SimpleObject)]
struct PingResult {
	pong: String,
}

#[derive(Default)] pub struct SubscriptionShard_General;
#[Subscription] impl SubscriptionShard_General {
	/// This endpoint serves two purposes:
	/// * Keeps cloudflare from terminating the websocket for inactivity, in cases where >100s pass without data changing or the user navigating anywhere.
	/// * Keeps the frontend from closing the websocket, in cases where the client is not watching any data. (eg. on homepage when not signed-in)
	async fn linkPreserver(&self, _ctx: &async_graphql::Context<'_>, input: LinkPreserverInput) -> impl Stream<Item = Result<LinkPreserverResult, SubError>> {
		let base_stream = async_stream::stream! {
			let LinkPreserverInput { updateInterval } = input;
			if updateInterval < 10000 { Err(SubError::new(format!("Update-interval cannot be lower than 10000ms.")))?; }

			let mut refresh_requested_last_iteration = Path::new("./refreshPageForAllUsers_enabled").exists();
			loop {
				// create the listed file in the app-server pod (eg. using Lens), if you've made an update that you need all clients to refresh for
				let refresh_requested_new = Path::new("./refreshPageForAllUsers_enabled").exists();
				let refresh_just_requested = refresh_requested_new && !refresh_requested_last_iteration;
				let result = LinkPreserverResult {
					alive: true,
					pageRefreshRequested: refresh_just_requested,
				};
				refresh_requested_last_iteration = refresh_requested_new;

				yield Ok(result);
				rust_shared::tokio::time::sleep(Duration::from_millis(updateInterval)).await;
			}
		};
		base_stream
	}

	// for testing (eg. in gql-playground) [temporarily also used by frontend as a websocket keep-alive -- inferior to above since doesn't work in the no-data-watched case]
	#[graphql(name = "_ping")]
	async fn _ping(&self, _ctx: &async_graphql::Context<'_>) -> impl Stream<Item = PingResult> {
		let pong = "pong".to_owned();
		stream::once(async move { PingResult {
			pong,
		} })
	}

	// for debugging only, so hide from gql api introspection
	#[graphql(visible = false)]
	async fn checkUser<'a>(&self, ctx: &'a async_graphql::Context<'a>) -> impl Stream<Item = Result<CheckUserResult, SubError>> + 'a {
		let base_stream = async_stream::stream! {
			let jwt_data = get_user_jwt_data_from_gql_ctx(ctx).await.map_err(to_sub_err)?;
			yield Ok(CheckUserResult { userID: jwt_data.id });
		};
		base_stream
	}
}

#[derive(SimpleObject, Debug)]
struct CheckUserResult {
	userID: String,
}

}
