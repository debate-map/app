use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use tokio_postgres::{Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct NodeRating {
    pub id: ID,
    pub accessPolicy: String,
    pub node: String,
    pub r#type: String,
	pub creator: String,
	pub createdAt: i64,
	pub value: f32,
}
impl From<tokio_postgres::row::Row> for NodeRating {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            accessPolicy: row.get("accessPolicy"),
            node: row.get("node"),
            r#type: row.get("type"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            value: row.get("value"),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_NodeRating { nodes: Vec<NodeRating> }
#[Object] impl GQLSet_NodeRating { async fn nodes(&self) -> &Vec<NodeRating> { &self.nodes } }
impl GQLSet<NodeRating> for GQLSet_NodeRating {
    fn from(entries: Vec<NodeRating>) -> GQLSet_NodeRating { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<NodeRating> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_NodeRating;
#[Subscription]
impl SubscriptionShard_NodeRating {
    async fn nodeRatings<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = GQLSet_NodeRating> + 'a {
        handle_generic_gql_collection_request::<NodeRating, GQLSet_NodeRating>(ctx, "nodeRatings", filter).await
    }
    async fn nodeRating<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Option<FilterInput>) -> impl Stream<Item = Option<NodeRating>> + 'a {
        handle_generic_gql_doc_request::<NodeRating>(ctx, "nodeRatings", id).await
    }
}

}