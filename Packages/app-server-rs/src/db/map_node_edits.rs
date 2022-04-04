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
pub struct MapNodeEdit {
    pub id: ID,
	pub map: String,
	pub node: String,
	pub time: i64,
	pub r#type: String,
}
impl From<tokio_postgres::row::Row> for MapNodeEdit {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            map: row.get("map"),
            node: row.get("node"),
            time: row.get("time"),
            r#type: row.get("type"),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_MapNodeEdit { nodes: Vec<MapNodeEdit> }
#[Object] impl GQLSet_MapNodeEdit { async fn nodes(&self) -> &Vec<MapNodeEdit> { &self.nodes } }
impl GQLSet<MapNodeEdit> for GQLSet_MapNodeEdit {
    fn from(entries: Vec<MapNodeEdit>) -> GQLSet_MapNodeEdit { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<MapNodeEdit> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_MapNodeEdit;
#[Subscription]
impl SubscriptionShard_MapNodeEdit {
    async fn mapNodeEdits<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = GQLSet_MapNodeEdit> + 'a {
        handle_generic_gql_collection_request::<MapNodeEdit, GQLSet_MapNodeEdit>(ctx, "mapNodeEdits", filter).await
    }
    async fn mapNodeEdit<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Option<FilterInput>) -> impl Stream<Item = Option<MapNodeEdit>> + 'a {
        handle_generic_gql_doc_request::<MapNodeEdit>(ctx, "mapNodeEdits", id).await
    }
}

}