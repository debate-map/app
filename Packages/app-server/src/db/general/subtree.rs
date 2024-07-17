use deadpool_postgres::{Client, Pool, Transaction};
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt, TryStreamExt};
use jsonschema::output::BasicOutput;
use jsonschema::JSONSchema;
use lazy_static::lazy_static;
use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::async_graphql::{self, async_stream, scalar, EmptySubscription, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::indexmap::{IndexMap, IndexSet};
use rust_shared::itertools::Itertools;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio::sync::RwLock;
use rust_shared::tokio_postgres::Row;
use rust_shared::utils::general_::extensions::VecLenU32;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{serde, to_sub_err, GQLError, SubError};
use std::collections::HashSet;
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use std::{pin::Pin, task::Poll, time::Duration};
use tracing::warn;

use crate::db::_general::GenericMutation_Result;
use crate::db::commands::_command::NoExtras;
use crate::db::commands::clone_subtree::clone_subtree;
use crate::db::commands::delete_node::DeleteNodeInput;
use crate::db::commands::delete_node_link::DeleteNodeLinkInput;
use crate::db::commands::run_command_batch::{run_command_batch, CommandEntry, RunCommandBatchInput};
use crate::db::general::sign_in_::jwt_utils::get_user_info_from_gql_ctx;
use crate::db::medias::Media;
use crate::db::node_links::NodeLink;
use crate::db::node_phrasings::NodePhrasing;
use crate::db::node_revisions::NodeRevision;
use crate::db::node_tags::NodeTag;
use crate::db::nodes_::_node::Node;
use crate::db::terms::Term;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::db::agql_ext::gql_utils::IndexMapAGQL;
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

#[derive(SimpleObject, Clone, Serialize, Deserialize, Default)]
pub struct Subtree {
	pub terms: Vec<Term>,
	pub medias: Vec<Media>,
	pub nodes: Vec<Node>,
	pub nodeLinks: Vec<NodeLink>,
	pub nodeRevisions: Vec<NodeRevision>,
	pub nodePhrasings: Vec<NodePhrasing>,
	pub nodeTags: Vec<NodeTag>,
}
impl Subtree {
	pub fn get_all_ids(&self) -> HashSet<String> {
		let mut result = HashSet::<String>::new();
		for entry in &self.terms { result.insert(entry.id.to_string()); }
		for entry in &self.medias { result.insert(entry.id.to_string()); }
		for entry in &self.nodes { result.insert(entry.id.to_string()); }
		for entry in &self.nodeLinks { result.insert(entry.id.to_string()); }
		for entry in &self.nodeRevisions { result.insert(entry.id.to_string()); }
		for entry in &self.nodePhrasings { result.insert(entry.id.to_string()); }
		for entry in &self.nodeTags { result.insert(entry.id.to_string()); }
		result
	}
	pub fn sort_all_entries(&mut self) {
		// see here for reason sort_by_key isn't used: https://stackoverflow.com/a/47126516
		//self.terms.sort_by_key(|a| &a.id);
		self.terms.sort_by(|x, y| x.id.cmp(&y.id));
		self.medias.sort_by(|x, y| x.id.cmp(&y.id));
		self.nodes.sort_by(|x, y| x.id.cmp(&y.id));
		self.nodeLinks.sort_by(|x, y| x.id.cmp(&y.id));
		self.nodeRevisions.sort_by(|x, y| x.id.cmp(&y.id));
		self.nodePhrasings.sort_by(|x, y| x.id.cmp(&y.id));
		self.nodeTags.sort_by(|x, y| x.id.cmp(&y.id));
	}
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Descendant {
	id: String,
	link_id: Option<String>,
	distance: i32,
}
impl From<Row> for Descendant {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Ancestor {
	id: String,
	distance: i32,
}
impl From<Row> for Ancestor {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct PathNodeFromDB {
	node_id: String,
	link_id: Option<String>,
}
impl From<Row> for PathNodeFromDB {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(Default)]
pub struct QueryShard_General_Subtree;
#[Object]
impl QueryShard_General_Subtree {
	async fn subtree(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, GQLError> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;

		let subtree = get_node_subtree(&ctx, root_node_id, max_depth.unwrap_or(10000)).await?;
		Ok(subtree)
	}

	// temp
	async fn subtree2(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, GQLError> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;

		let subtree = get_node_subtree2(&ctx, root_node_id, max_depth.unwrap_or(10000)).await?;
		Ok(subtree)
	}

	// lower-level functions
	async fn descendants(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Vec<Descendant>, GQLError> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
		let max_depth_i32 = max_depth.unwrap_or(10000) as i32;

		let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from descendants($1, $2)"#, params(&[&root_node_id, &max_depth_i32])).await?.try_collect().await?;
		let descendants: Vec<Descendant> = rows.into_iter().map(|a| a.into()).collect();
		Ok(descendants)
	}
	async fn ancestors(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Vec<Ancestor>, GQLError> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
		let max_depth_i32 = max_depth.unwrap_or(10000) as i32;

		let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from ancestors($1, $2)"#, params(&[&root_node_id, &max_depth_i32])).await?.try_collect().await?;
		let ancestors: Vec<Ancestor> = rows.into_iter().map(|a| a.into()).collect();
		Ok(ancestors)
	}
	async fn shortestPath(&self, gql_ctx: &async_graphql::Context<'_>, start_node: String, end_node: String) -> Result<Vec<PathNodeFromDB>, GQLError> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;

		let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from shortest_path($1, $2)"#, params(&[&start_node, &end_node])).await?.try_collect().await?;
		let path_nodes: Vec<PathNodeFromDB> = rows.into_iter().map(|a| a.into()).collect();
		Ok(path_nodes)
	}

	async fn descendants2(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Vec<Descendant>, GQLError> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
		let max_depth_i32 = max_depth.unwrap_or(10000) as i32;

		let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT * from descendants2($1, $2)"#, params(&[&root_node_id, &max_depth_i32])).await?.try_collect().await?;
		let descendants: Vec<Descendant> = rows.into_iter().map(|a| a.into()).collect();
		Ok(descendants)
	}

	async fn get_prepared_data_for_deleting_subtree(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteSubtreeInput) -> Result<PreparedDataForDeletingSubtree, GQLError> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;

		let actor = get_user_info_from_gql_ctx(gql_ctx, &ctx).await?;
		let (_subcommands, prepared_data) = get_prepared_data_for_deleting_subtree(&ctx, &actor, input, NoExtras::default()).await?;
		Ok(prepared_data)
	}
}

// mutations
// ==========

#[derive(Default)] pub struct MutationShard_General_Subtree;
#[Object] impl MutationShard_General_Subtree {
	async fn cloneSubtree(&self, gql_ctx: &async_graphql::Context<'_>, payload: JSONValue) -> Result<GenericMutation_Result, GQLError> {
		let result = clone_subtree(gql_ctx, payload).await?;
		Ok(result)
	}
}

// subscriptions
// ==========

#[derive(Default)] pub struct SubscriptionShared_General_Subtree;
#[Subscription] impl SubscriptionShared_General_Subtree {
	async fn delete_subtree<'a>(&self, gql_ctx: &'a async_graphql::Context<'a>, input: DeleteSubtreeInput) -> impl Stream<Item = Result<DeleteSubtreeResult, SubError>> + 'a {
		async_stream::stream! {
			let mut anchor = DataAnchorFor1::empty(); // holds pg-client
			let ctx = AccessorContext::new_write_advanced(&mut anchor, gql_ctx, false, Some(false)).await.map_err(to_sub_err)?;
			let actor = get_user_info_from_gql_ctx(gql_ctx, &ctx).await.map_err(to_sub_err)?;

			let (subcommands, _prepared_data) = get_prepared_data_for_deleting_subtree(&ctx, &actor, input.clone(), NoExtras::default()).await.map_err(to_sub_err)?;
			let subcommand_count = subcommands.len_u32();

			let mut last_subcommand_results: Vec<JSONValue> = Vec::new();
			{
				let batch_input = RunCommandBatchInput { commands: subcommands };
				let mut stream = Box::pin(run_command_batch(&ctx, &actor, false, batch_input, NoExtras::default()).await);
				while let Some(batch_result_so_far) = stream.next().await {
					let batch_result_so_far = batch_result_so_far?;
					last_subcommand_results = batch_result_so_far.results.clone();
					let subtree_delete_result_so_far = DeleteSubtreeResult { subcommand_count: subcommand_count, subcommand_results: last_subcommand_results.clone(), committed: false };
					yield Ok(subtree_delete_result_so_far);
				}
			}

			ctx.tx.commit().await.map_err(to_sub_err)?;
			tracing::info!("Command-batch execution completed. @CommandCount:{}", subcommand_count);
			yield Ok(DeleteSubtreeResult { subcommand_count: subcommand_count, subcommand_results: last_subcommand_results, committed: true });
		}
	}
}

#[derive(SimpleObject)]
struct PreparedDataForDeletingSubtree {
	// commented; including this in the result structure requires SimpleObject on CommandEntry, *and all downstream input structs*
	//subcommands: Vec<CommandEntry>,
	subcommand_count: u32,
	nodes_to_unlink_ids: Vec<String>,
	nodes_to_delete_ids: Vec<String>,
	nodes_to_delete_access_policies: IndexMapAGQL<String, u32>,
	nodes_to_delete_creator_ids: IndexMapAGQL<String, u32>,
	nodes_to_delete_creation_times: Vec<i64>,
}

#[derive(InputObject, Deserialize, Serialize, Clone)]
pub struct DeleteSubtreeInput {
	pub map_id: Option<String>,
	pub root_node_id: String,
	pub max_depth: i32,
}

#[derive(SimpleObject, Debug, Serialize)]
pub struct DeleteSubtreeResult {
	pub subcommand_count: u32,
	pub subcommand_results: Vec<JSONValue>,
	pub committed: bool,
}

}

#[rustfmt::skip]
async fn get_prepared_data_for_deleting_subtree(ctx: &AccessorContext<'_>, _actor: &User, input: DeleteSubtreeInput, _extras: NoExtras) -> Result<(Vec<CommandEntry>, PreparedDataForDeletingSubtree), Error> {
	let DeleteSubtreeInput { map_id: _mapID, root_node_id: rootNodeID, max_depth: maxDepth } = input;

	let mut subcommands = Vec::<CommandEntry>::new();
	let mut links_to_unlink = IndexSet::<String>::new();
	// collections that'll be inserted into the prepared-data structure
	let mut nodes_to_unlink_ids = IndexSet::<String>::new();
	let mut nodes_to_delete_ids = IndexSet::<String>::new();
	let mut nodes_to_delete_access_policies = IndexMap::<String, u32>::new();
	let mut nodes_to_delete_creator_ids = IndexMap::<String, u32>::new();
	let mut nodes_to_delete_creation_times = Vec::<i64>::new(); // vec used; if someone nodes have identical creation-times, add each entry separately

    let mut rows: Vec<Row> = ctx.tx.query_raw(r#"
        SELECT
            d.id, d.link_id, d.distance, d.single_parent_ancestry,
            n."accessPolicy", n.creator, n."createdAt"
        FROM
            descendants_with_ancestry_attributes($1, $2, $3) d
            LEFT JOIN nodes n ON (d.id = n.id)
    "#, params(&[&rootNodeID, &maxDepth, &false])).await?.try_collect().await?;
    // reverse the results, so we get the deepest nodes first
    rows.reverse();

	//let rows_by_node_id: IndexMap<String, Vec<Row>> = rows.into_iter().group_by(|row| row.get(0)).into_iter().map(|(k, g)| (k, g.collect_vec())).collect();
	//for (node_id, rows) in rows_by_node_id {

	// each row represents a discovered node-link within the subtree being deleted
	for row in rows {
		let node_id: String = row.get(0);
		let link_id = row.get(1);
		//let distance: i32 = row.get(2);
		let single_parent_ancestry: bool = row.get(3);
		let access_policy: String = row.get(4);
		let creator_id: String = row.get(5);
		let creation_time: i64 = row.get(6);

		// if this link is the only place the child exists, mark the child for deletion
		if single_parent_ancestry {
			nodes_to_delete_ids.insert(node_id.to_string());
			*nodes_to_delete_access_policies.entry(access_policy).or_insert(0) += 1;
			*nodes_to_delete_creator_ids.entry(creator_id).or_insert(0) += 1;
			nodes_to_delete_creation_times.push(creation_time);
		}
		// else, mark the child for mere unlinking
		else {
			if let Some(link_id) = link_id {
				nodes_to_unlink_ids.insert(node_id.to_string());
				links_to_unlink.insert(link_id);
			} else {
				// if link_id is null, then this was the subtree's root-node; the fact that we're here means it had more than one parent/parent-link, which is not ideal so log a warning
				warn!("Delete-subtree was called on a tree whose root-node ({}) had more than one parent. Deletion of subtree root was skipped.", node_id);
			}
		}
	}

	for link_id in links_to_unlink.iter() {
		let command = CommandEntry { deleteNodeLink: Some(DeleteNodeLinkInput { mapID: None, id: link_id.clone(), incrementEdits: Some(false) }), ..Default::default() };
		subcommands.push(command);
	}

	for node_id in nodes_to_delete_ids.iter() {
		let command = CommandEntry { deleteNode: Some(DeleteNodeInput { mapID: None, nodeID: node_id.clone(), incrementEdits: Some(false) }), ..Default::default() };
		subcommands.push(command);
	}

	let subcommand_count = subcommands.len_u32();
	Ok((subcommands, PreparedDataForDeletingSubtree {
		subcommand_count,
		nodes_to_unlink_ids: nodes_to_unlink_ids.into_iter().collect(),
		nodes_to_delete_ids: nodes_to_delete_ids.into_iter().collect(),
		nodes_to_delete_access_policies: IndexMapAGQL(nodes_to_delete_access_policies),
		nodes_to_delete_creator_ids: IndexMapAGQL(nodes_to_delete_creator_ids),
		nodes_to_delete_creation_times,
	}))
}
