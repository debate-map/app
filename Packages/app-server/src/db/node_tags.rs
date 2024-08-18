use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::anyhow::Error;
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::indexmap::IndexSet;
use rust_shared::itertools::Itertools;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{serde_json, GQLError, SubError};

use crate::utils::db::accessors::{get_db_entries, get_db_entry, AccessorContext};
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::{
	filter::FilterInput,
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
	pg_row_to_json::{postgres_row_to_json_value, postgres_row_to_struct},
};

use super::_shared::access_policy_target::AccessPolicyTarget;
use super::commands::_command::{CanNullOrOmit, CanOmit};
use super::nodes::get_node;

#[rustfmt::skip]
pub async fn get_node_tag(ctx: &AccessorContext<'_>, id: &str) -> Result<NodeTag, Error> {
    get_db_entry(ctx, "nodeTags", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
#[rustfmt::skip]
pub async fn get_node_tags(ctx: &AccessorContext<'_>, node_id: &str) -> Result<Vec<NodeTag>, Error> {
    get_db_entries(ctx, "nodeTags", &Some(json!({
        "nodes": {"contains": [node_id]}
    }))).await
}

wrap_slow_macros! {

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct NodeTag {
	pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub nodes: Vec<String>,
	pub labels: Option<TagComp_Labels>,
	pub mirrorChildrenFromXToY: Option<TagComp_MirrorChildrenFromXToY>,
	pub xIsExtendedByY: Option<TagComp_XIsExtendedByY>,
	pub mutuallyExclusiveGroup: Option<TagComp_MutuallyExclusiveGroup>,
	pub restrictMirroringOfX: Option<TagComp_RestrictMirroringOfX>,
	pub cloneHistory: Option<TagComp_CloneHistory>,

	#[graphql(name = "c_accessPolicyTargets")]
	pub c_accessPolicyTargets: Vec<AccessPolicyTarget>,
}
impl From<Row> for NodeTag {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}
impl NodeTag {
	pub fn get_tag_comps(&self) -> Vec<Box<dyn TagComp>> {
		// there's probably a cleaner way to do this
		let mut result: Vec<Box<dyn TagComp>> = vec![];
		result.extend(self.labels.iter().map(|x| Box::new(x.clone()) as Box<dyn TagComp>));
		result.extend(self.mirrorChildrenFromXToY.iter().map(|x| Box::new(x.clone()) as Box<dyn TagComp>));
		result.extend(self.xIsExtendedByY.iter().map(|x| Box::new(x.clone()) as Box<dyn TagComp>));
		result.extend(self.mutuallyExclusiveGroup.iter().map(|x| Box::new(x.clone()) as Box<dyn TagComp>));
		result.extend(self.restrictMirroringOfX.iter().map(|x| Box::new(x.clone()) as Box<dyn TagComp>));
		result.extend(self.cloneHistory.iter().map(|x| Box::new(x.clone()) as Box<dyn TagComp>));
		result
	}
	pub fn calculate_new_nodes_list(&self) -> Vec<String> {
		let mut result = IndexSet::<String>::new();
		for comp in self.get_tag_comps() {
			result.extend(comp.get_node_ids());
		}
		result.into_iter().collect::<Vec<String>>()
	}
	pub fn to_input(&self) -> NodeTagInput {
		NodeTagInput {
			nodes: self.nodes.clone(),
			labels: self.labels.clone(),
			mirrorChildrenFromXToY: self.mirrorChildrenFromXToY.clone(),
			xIsExtendedByY: self.xIsExtendedByY.clone(),
			mutuallyExclusiveGroup: self.mutuallyExclusiveGroup.clone(),
			restrictMirroringOfX: self.restrictMirroringOfX.clone(),
			cloneHistory: self.cloneHistory.clone(),
		}
	}
}

#[derive(InputObject, Clone, Serialize, Deserialize, Default)]
pub struct NodeTagInput {
	pub nodes: Vec<String>,
	pub labels: Option<TagComp_Labels>,
	pub mirrorChildrenFromXToY: Option<TagComp_MirrorChildrenFromXToY>,
	pub xIsExtendedByY: Option<TagComp_XIsExtendedByY>,
	pub mutuallyExclusiveGroup: Option<TagComp_MutuallyExclusiveGroup>,
	pub restrictMirroringOfX: Option<TagComp_RestrictMirroringOfX>,
	pub cloneHistory: Option<TagComp_CloneHistory>,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct NodeTagUpdates {
	pub nodes: CanOmit<Vec<String>>,
	pub labels: CanNullOrOmit<TagComp_Labels>,
	pub mirrorChildrenFromXToY: CanNullOrOmit<TagComp_MirrorChildrenFromXToY>,
	pub xIsExtendedByY: CanNullOrOmit<TagComp_XIsExtendedByY>,
	pub mutuallyExclusiveGroup: CanNullOrOmit<TagComp_MutuallyExclusiveGroup>,
	pub restrictMirroringOfX: CanNullOrOmit<TagComp_RestrictMirroringOfX>,
	pub cloneHistory: CanNullOrOmit<TagComp_CloneHistory>,
}

pub trait TagComp {
	fn get_node_ids(&self) -> Vec<String>;
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "TagCompLabelsInput")]
//#[graphql(name = "TagComp_Labels", input_name = "TagComp_LabelsInput")] # todo: use this approach once async-graphql is updated
pub struct TagComp_Labels {
	pub nodeX: String,
	pub labels: Vec<String>,
}
impl TagComp for TagComp_Labels {
	fn get_node_ids(&self) -> Vec<String> { vec![self.nodeX.clone()] }
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "TagCompMirrorChildrenFromXToYInput")]
pub struct TagComp_MirrorChildrenFromXToY {
	pub nodeX: String,
	pub nodeY: String,
	pub mirrorSupporting: bool,
	pub mirrorOpposing: bool,
	pub reversePolarities: bool,
	pub disableDirectChildren: bool,
}
impl TagComp for TagComp_MirrorChildrenFromXToY {
	fn get_node_ids(&self) -> Vec<String> { vec![self.nodeX.clone(), self.nodeY.clone()] }
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "TagCompXIsExtendedByYInput")]
pub struct TagComp_XIsExtendedByY {
	pub nodeX: String,
	pub nodeY: String,
}
impl TagComp for TagComp_XIsExtendedByY {
	fn get_node_ids(&self) -> Vec<String> { vec![self.nodeX.clone(), self.nodeY.clone()] }
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "TagCompMutuallyExclusiveGroupInput")]
pub struct TagComp_MutuallyExclusiveGroup {
	pub nodes: Vec<String>,
	pub mirrorXProsAsYCons: bool,
}
impl TagComp for TagComp_MutuallyExclusiveGroup {
	fn get_node_ids(&self) -> Vec<String> { self.nodes.clone() }
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "TagCompRestrictMirroringOfXInput")]
pub struct TagComp_RestrictMirroringOfX {
	nodeX: String,
	blacklistAllMirrorParents: bool,
	blacklistedMirrorParents: Vec<String>,
}
impl TagComp for TagComp_RestrictMirroringOfX {
	fn get_node_ids(&self) -> Vec<String> { vec![vec![self.nodeX.clone()], self.blacklistedMirrorParents.clone()].concat() }
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "TagCompCloneHistoryInput")]
pub struct TagComp_CloneHistory {
	pub cloneChain: Vec<String>,
}
impl TagComp for TagComp_CloneHistory {
	fn get_node_ids(&self) -> Vec<String> { self.cloneChain.clone() }
}

#[derive(Clone)] pub struct GQLSet_NodeTag { pub nodes: Vec<NodeTag> }
#[Object] impl GQLSet_NodeTag { async fn nodes(&self) -> &Vec<NodeTag> { &self.nodes } }
impl GQLSet<NodeTag> for GQLSet_NodeTag {
	fn from(entries: Vec<NodeTag>) -> GQLSet_NodeTag { Self { nodes: entries } }
	fn nodes(&self) -> &Vec<NodeTag> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_NodeTag;
#[Object] impl QueryShard_NodeTag {
	async fn nodeTags(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<NodeTag>, GQLError> {
		handle_generic_gql_collection_query(ctx, "nodeTags", filter).await
	}
	async fn nodeTag(&self, ctx: &Context<'_>, id: String) -> Result<Option<NodeTag>, GQLError> {
		handle_generic_gql_doc_query(ctx, "nodeTags", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_NodeTag;
#[Subscription] impl SubscriptionShard_NodeTag {
	async fn nodeTags<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_NodeTag, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<NodeTag, GQLSet_NodeTag>(ctx, "nodeTags", filter, None).await
	}
	async fn nodeTag<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<NodeTag>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<NodeTag>(ctx, "nodeTags", id).await
	}
}

}
