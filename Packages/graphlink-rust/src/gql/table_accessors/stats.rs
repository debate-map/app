use std::sync::atomic::Ordering;
use std::sync::Arc;

use crate::anyhow::Error;
use crate::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use crate::indexmap::IndexMap;
use crate::rust_macros::wrap_slow_macros;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json::json;
use crate::tokio_postgres::{Client, Row};
use crate::utils::errors::errors::{GQLError, SubError};
use crate::utils::general::type_aliases::JSONValue;
use crate::{async_graphql, get_app_state_from_gql_ctx, get_live_markers, get_user_info_from_gql_ctx, is_user_admin, to_gql_err, try_get_user_jwt_data_from_gql_ctx, DataAnchorFor1, IndexMapAGQL, LQBatch, LQInstance, LQKey, LQStorageArc, ListChange, ListChangeType, ToOwnedV};
use crate::{get_db_entries, get_db_entry, AccessorContext};
use crate::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, FilterInput};
use crate::{serde, ListChangeCore};
use crate::{CanNullOrOmit, CanOmit};
use anyhow::ensure;
use futures_util::{stream, Stream, TryFutureExt};

wrap_slow_macros! {

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct GraphlinkStats {
	pub groups: IndexMapAGQL<String, LQGroupStats>,
}
#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct LQGroupStats {
	pub batches: IndexMapAGQL<String, LQBatchStats>,

	/// Map of live-query instances that are awaiting population.
	pub instances_awaiting_population: IndexMapAGQL<String, LQInstanceStats>,

	/// Map of committed live-query instances.
	pub instances_committed: IndexMapAGQL<String, LQInstanceStats>,

	pub channel_messages_in: u64,
	pub channel_messages_out: u64,
	pub channel_messages_for_batches: u64,
}
#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct LQBatchStats {
	pub instances: IndexMapAGQL<String, LQInstanceStats>,
}
#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct LQInstanceStats {
	pub key: String,
	pub last_entries: CountAndSize,
	pub last_entries_set_count: u64,
	pub entry_watchers: u64,
	pub entry_watcher_channel_messages_for_changes: Vec<u64>,
}
#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct CountAndSize {
	pub count: u64,
	pub size_mb: f64,
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct LQDebugMarkers {
	pub marker_infos: Vec<String>,
}

#[derive(Default)] pub struct QueryShard_Graphlink_Stats;
#[Object] impl QueryShard_Graphlink_Stats {
	async fn graphlinkStats(&self, ctx: &Context<'_>) -> Result<GraphlinkStats, GQLError> {
		get_graphlink_stats(ctx).await.map_err(to_gql_err)
	}
	async fn lqDebugMarkers(&self, ctx: &Context<'_>, data_id_substring: String) -> Result<LQDebugMarkers, GQLError> {
		get_lq_debug_markers(ctx, data_id_substring).await.map_err(to_gql_err)
	}
}

}

async fn get_graphlink_stats(gql_ctx: &Context<'_>) -> Result<GraphlinkStats, Error> {
	let mut anchor = DataAnchorFor1::empty(); // holds pg-client
	let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
	let actor = get_user_info_from_gql_ctx(gql_ctx, &ctx).await?;
	ensure!(is_user_admin(&actor), "Must be admin to call this endpoint.");

	let app_state = get_app_state_from_gql_ctx(gql_ctx).clone();
	let lq_storage = app_state.live_queries.clone();
	let result = lq_storage.get_stats().await?;

	//ctx.tx.commit().await?;
	return Ok(result);
}

async fn get_lq_debug_markers(gql_ctx: &Context<'_>, data_id_substring: String) -> Result<LQDebugMarkers, Error> {
	let mut anchor = DataAnchorFor1::empty(); // holds pg-client
	let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
	let actor = get_user_info_from_gql_ctx(gql_ctx, &ctx).await?;
	ensure!(is_user_admin(&actor), "Must be admin to call this endpoint.");

	Ok(LQDebugMarkers { marker_infos: get_live_markers(data_id_substring) })
}
