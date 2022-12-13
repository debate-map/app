use rust_shared::anyhow::Error;
use rust_shared::{SubError, serde_json};
use rust_shared::async_graphql::{self, Enum};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entry}}};

pub async fn get_node(ctx: &AccessorContext<'_>, id: &str) -> Result<Node, Error> {
    get_db_entry(ctx, "nodes", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum NodeType {
    #[graphql(name = "category")] category,
    #[graphql(name = "package")] package,
    #[graphql(name = "multiChoiceQuestion")] multiChoiceQuestion,
    #[graphql(name = "claim")] claim,
    #[graphql(name = "argument")] argument,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct Node {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
    pub r#type: NodeType,
	pub rootNodeForMap: Option<String>,
    #[graphql(name = "c_currentRevision")]
	//pub c_currentRevision: Option<String>,
	pub c_currentRevision: String,
	pub accessPolicy: String,
	pub multiPremiseArgument: Option<bool>,
	pub argumentType: Option<String>,
	pub extras: serde_json::Value,
}
impl From<Row> for Node {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(Clone)] pub struct GQLSet_Node { nodes: Vec<Node> }
#[Object] impl GQLSet_Node { async fn nodes(&self) -> &Vec<Node> { &self.nodes } }
impl GQLSet<Node> for GQLSet_Node {
    fn from(entries: Vec<Node>) -> GQLSet_Node { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Node> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_Node;
#[Subscription]
impl SubscriptionShard_Node {
    async fn nodes<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Node, SubError>> + 'a {
        handle_generic_gql_collection_request::<Node, GQLSet_Node>(ctx, "nodes", filter).await
    }
    async fn node<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Node>, SubError>> + 'a {
        handle_generic_gql_doc_request::<Node>(ctx, "nodes", id).await
    }
}

}