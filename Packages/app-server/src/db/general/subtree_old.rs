use deadpool_postgres::{Client, Pool, Transaction};
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt, TryStreamExt};
use jsonschema::output::BasicOutput;
use jsonschema::JSONSchema;
use lazy_static::lazy_static;
use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::async_graphql::{self, async_stream, scalar, EmptySubscription, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio::sync::RwLock;
use rust_shared::tokio_postgres::Row;
use rust_shared::GQLError;
use std::collections::HashSet;
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use std::{pin::Pin, task::Poll, time::Duration};

use crate::db::_general::GenericMutation_Result;
use crate::db::commands::clone_subtree::clone_subtree;
use crate::db::medias::Media;
use crate::db::node_links::NodeLink;
use crate::db::node_phrasings::NodePhrasing;
use crate::db::node_tags::NodeTag;
use crate::db::terms::Term;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::db::filter::{FilterInput, QueryFilter};
use crate::utils::db::generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet};
use crate::utils::db::sql_fragment::SQLFragment;
use crate::utils::db::transactions::start_read_transaction;
use crate::utils::general::data_anchor::{DataAnchor, DataAnchorFor1};
use crate::utils::type_aliases::PGClientObject;

use super::subtree::Subtree;
use super::subtree_collector_old::{populate_subtree_collector_old, SubtreeCollector_Old};

pub async fn get_subtree_old(ctx: &AccessorContext<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, Error> {
	let collector = SubtreeCollector_Old::default();
	let root_path_segments = vec![root_node_id.clone()];
	let collector_arc = Arc::new(RwLock::new(collector));
	populate_subtree_collector_old(&ctx, root_node_id, max_depth.unwrap_or(usize::MAX), &root_path_segments, collector_arc.clone()).await?;

	let arc_clone = collector_arc.clone();
	let collector = arc_clone.read().await;
	let subtree = collector.to_subtree();
	Ok(subtree)
}

wrap_slow_macros! {

#[derive(Default)]
pub struct QueryShard_General_Subtree_Old;
#[Object]
impl QueryShard_General_Subtree_Old {
	async fn subtree_old(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, GQLError> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;

		let collector = SubtreeCollector_Old::default();
		let root_path_segments = vec![root_node_id.clone()];
		let collector_arc = Arc::new(RwLock::new(collector));
		populate_subtree_collector_old(&ctx, root_node_id, max_depth.unwrap_or(usize::MAX), &root_path_segments, collector_arc.clone()).await?;

		let arc_clone = collector_arc.clone();
		let collector = arc_clone.read().await;
		let subtree = collector.to_subtree();

		Ok(subtree)
	}
}

}
