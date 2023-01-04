use rust_shared::SubError;
use rust_shared::async_graphql;
use rust_shared::async_graphql::Enum;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::anyhow::Error;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};

use crate::utils::db::accessors::AccessorContext;
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

use super::_shared::access_policy_target::AccessPolicyTarget;
use super::maps::get_map;
use super::nodes::get_node;

wrap_slow_macros!{

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum ChangeType {
    #[graphql(name = "add")] add,
    #[graphql(name = "edit")] edit,
    #[graphql(name = "remove")] remove,
}

// this is called "MapNodeEdit" rather than just "NodeEdit", due to it always being a node edit in the context of a map
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MapNodeEdit {
    pub id: ID,
	pub map: String,
	pub node: String,
	pub time: i64,
	pub r#type: ChangeType,
    #[graphql(name = "c_accessPolicyTargets")]
    pub c_accessPolicyTargets: Vec<AccessPolicyTarget>,
}
impl From<Row> for MapNodeEdit {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(Clone)] pub struct GQLSet_MapNodeEdit { nodes: Vec<MapNodeEdit> }
#[Object] impl GQLSet_MapNodeEdit { async fn nodes(&self) -> &Vec<MapNodeEdit> { &self.nodes } }
impl GQLSet<MapNodeEdit> for GQLSet_MapNodeEdit {
    fn from(entries: Vec<MapNodeEdit>) -> GQLSet_MapNodeEdit { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<MapNodeEdit> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_NodeEdit;
#[Subscription]
impl SubscriptionShard_NodeEdit {
    async fn mapNodeEdits<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_MapNodeEdit, SubError>> + 'a {
        handle_generic_gql_collection_request::<MapNodeEdit, GQLSet_MapNodeEdit>(ctx, "mapNodeEdits", filter).await
    }
    async fn mapNodeEdit<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<MapNodeEdit>, SubError>> + 'a {
        handle_generic_gql_doc_request::<MapNodeEdit>(ctx, "mapNodeEdits", id).await
    }
}

}