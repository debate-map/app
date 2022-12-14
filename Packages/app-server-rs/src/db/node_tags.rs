use rust_shared::anyhow::Error;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, pg_row_to_json::{postgres_row_to_json_value, postgres_row_to_struct}}};
use crate::utils::db::accessors::{get_db_entry, AccessorContext, get_db_entries};

use super::commands::_command::{FieldUpdate, FieldUpdate_Nullable};

pub async fn get_node_tag(ctx: &AccessorContext<'_>, id: &str) -> Result<NodeTag, Error> {
    get_db_entry(ctx, "nodeTags", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_node_tags_for(ctx: &AccessorContext<'_>, node_id: &str) -> Result<Vec<NodeTag>, Error> {
    get_db_entries(ctx, "nodeTags", &Some(json!({
        "nodes": {"contains": [node_id]}
    }))).await
}

wrap_slow_macros!{

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct NodeTag {
    pub id: ID,
    pub creator: String,
    pub createdAt: i64,
    pub nodes: Vec<String>,
    pub labels: Option<TagComp_Labels>,
    pub mirrorChildrenFromXToY: Option<JSONValue>,
    pub xIsExtendedByY: Option<JSONValue>,
    pub mutuallyExclusiveGroup: Option<JSONValue>,
    pub restrictMirroringOfX: Option<JSONValue>,
    pub cloneHistory: Option<TagComp_CloneHistory>,
}
impl From<Row> for NodeTag {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct NodeTagInput {
    pub nodes: Vec<String>,
    pub labels: Option<TagComp_Labels>,
    pub mirrorChildrenFromXToY: Option<JSONValue>,
    pub xIsExtendedByY: Option<JSONValue>,
    pub mutuallyExclusiveGroup: Option<JSONValue>,
    pub restrictMirroringOfX: Option<JSONValue>,
    pub cloneHistory: Option<TagComp_CloneHistory>,
}

#[derive(InputObject, Deserialize)]
pub struct NodeTagUpdates {
    pub nodes: FieldUpdate<Vec<String>>,
    pub labels: FieldUpdate_Nullable<TagComp_Labels>,
    pub mirrorChildrenFromXToY: FieldUpdate_Nullable<JSONValue>,
    pub xIsExtendedByY: FieldUpdate_Nullable<JSONValue>,
    pub mutuallyExclusiveGroup: FieldUpdate_Nullable<JSONValue>,
    pub restrictMirroringOfX: FieldUpdate_Nullable<JSONValue>,
    pub cloneHistory: FieldUpdate_Nullable<TagComp_CloneHistory>,
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "TagCompLabelsInput")]
//#[graphql(name = "TagComp_Labels", input_name = "TagComp_LabelsInput")] # todo: use this approach once async-graphql is updated
pub struct TagComp_Labels {
	pub nodeX: String,
	pub labels: Vec<String>,
}
#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "TagCompCloneHistoryInput")]
//#[graphql(name = "TagComp_CloneHistory", input_name = "TagComp_CloneHistoryInput")] # todo: use this approach once async-graphql is updated
pub struct TagComp_CloneHistory {
    pub cloneChain: Vec<String>,
}

#[derive(Clone)] pub struct GQLSet_NodeTag { nodes: Vec<NodeTag> }
#[Object] impl GQLSet_NodeTag { async fn nodes(&self) -> &Vec<NodeTag> { &self.nodes } }
impl GQLSet<NodeTag> for GQLSet_NodeTag {
    fn from(entries: Vec<NodeTag>) -> GQLSet_NodeTag { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<NodeTag> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_NodeTag;
#[Subscription]
impl SubscriptionShard_NodeTag {
    async fn nodeTags<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_NodeTag, SubError>> + 'a {
        handle_generic_gql_collection_request::<NodeTag, GQLSet_NodeTag>(ctx, "nodeTags", filter).await
    }
    async fn nodeTag<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<NodeTag>, SubError>> + 'a {
        handle_generic_gql_doc_request::<NodeTag>(ctx, "nodeTags", id).await
    }
}

}