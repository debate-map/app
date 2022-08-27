use rust_shared::{SubError, serde_json, async_graphql};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct Share {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
    pub name: String,
    pub r#type: String,
	pub mapID: Option<String>,
	pub mapView: serde_json::Value,
}
impl From<Row> for Share {
	fn from(row: Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            name: row.get("name"),
            r#type: row.get("type"),
            mapID: row.get("mapID"),
            mapView: serde_json::from_value(row.get("mapView")).unwrap(),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_Share { nodes: Vec<Share> }
#[Object] impl GQLSet_Share { async fn nodes(&self) -> &Vec<Share> { &self.nodes } }
impl GQLSet<Share> for GQLSet_Share {
    fn from(entries: Vec<Share>) -> GQLSet_Share { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Share> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_Share;
#[Subscription]
impl SubscriptionShard_Share {
    async fn shares<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Share, SubError>> + 'a {
        handle_generic_gql_collection_request::<Share, GQLSet_Share>(ctx, "shares", filter).await
    }
    async fn share<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Option<FilterInput>) -> impl Stream<Item = Result<Option<Share>, SubError>> + 'a {
        handle_generic_gql_doc_request::<Share>(ctx, "shares", id).await
    }
}

}