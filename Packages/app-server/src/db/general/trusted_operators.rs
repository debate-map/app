use deadpool_postgres::{Client, Pool, Transaction};
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt, TryStreamExt};
use jsonschema::output::BasicOutput;
use jsonschema::JSONSchema;
use lazy_static::lazy_static;
use rust_shared::anyhow::{anyhow, ensure, Context, Error};
use rust_shared::async_graphql::{self, async_stream, scalar, EmptySubscription, Enum, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::once_cell::sync::Lazy;
use rust_shared::regex::Regex;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio::sync::{RwLock, Semaphore};
use rust_shared::tokio_postgres::Row;
use rust_shared::utils::general_::extensions::IteratorV;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{serde, GQLError};
use std::collections::HashSet;
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use std::{pin::Pin, task::Poll, time::Duration};

use crate::db::_general::{ensure_gql, ensure_trusted_operator_passkey_is_correct, GenericMutation_Result};
use crate::db::commands::clone_subtree::clone_subtree;
use crate::db::medias::Media;
use crate::db::node_links::NodeLink;
use crate::db::node_phrasings::NodePhrasing;
use crate::db::node_tags::NodeTag;
use crate::db::terms::Term;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::db::filter::{FilterInput, QueryFilter};
use crate::utils::db::generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::sql_fragment::SQLFragment;
use crate::utils::db::transactions::start_read_transaction;
use crate::utils::general::data_anchor::{DataAnchor, DataAnchorFor1};
use crate::utils::type_aliases::PGClientObject;

use super::subtree_collector::{get_node_subtree, get_node_subtree2, params};

wrap_slow_macros! {

// queries
// ==========

#[derive(InputObject, Serialize, Deserialize)]
pub struct FindUserIdsForGoogleIdInput {
	google_id: String,
	trusted_operator_passkey: String,
}
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct FindUserIdsForGoogleIdResult {
	user_ids: Vec<String>,
}

#[derive(Default)]
pub struct QueryShard_General_TrustedOperators;
#[Object]
impl QueryShard_General_TrustedOperators {
	/// Special query to find all user-ids associated with a given google-id (needed for user-sync with, eg. claim-miner). Must provide the trusted-provider passkey.
	/// (For now, this passkey is manually created in k8s [eg. using Lens], and shared privately with trusted partners/operators. K8s path: namespace "default", name "debate-map-trusted-provider", field "passkey")
	async fn find_user_ids_for_google_id(&self, gql_ctx: &async_graphql::Context<'_>, input: FindUserIdsForGoogleIdInput) -> Result<FindUserIdsForGoogleIdResult, GQLError> {
		let FindUserIdsForGoogleIdInput { google_id, trusted_operator_passkey } = input;
		ensure_trusted_operator_passkey_is_correct(trusted_operator_passkey, true)?;
		ensure_gql(google_id.len() > 0, "Google-id to search for cannot be empty.")?; // defensive; block finding users with empty google-id (atm only known to be the case for generated dev/test accounts)

		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		// For this query, bypass rls-checks. It appears safe, and brings major speed-gains (presumably since can use index): with bypass-rls=false, takes ~3000ms; with bypass-rls=true, takes <100ms
		let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, true).await?;
		let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT id FROM "userHiddens" WHERE ("providerData" #>> '{0,sub}') = $1"#, &[&google_id]).await?.try_collect().await?;

		let result = FindUserIdsForGoogleIdResult {
			user_ids: rows.into_iter().map(|a| a.get("id")).collect(),
		};
		Ok(result)
	}
}

}
