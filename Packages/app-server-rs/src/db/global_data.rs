use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};

#[derive(SimpleObject, Clone)]
pub struct GlobalData {
    id: ID,
    extras: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for GlobalData {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            extras: serde_json::from_value(row.get("extras")).unwrap(),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_GlobalData { nodes: Vec<GlobalData> }
#[Object] impl GQLSet_GlobalData { async fn nodes(&self) -> &Vec<GlobalData> { &self.nodes } }
impl GQLSet<GlobalData> for GQLSet_GlobalData {
    fn from(entries: Vec<GlobalData>) -> GQLSet_GlobalData { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<GlobalData> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_GlobalData;
#[Subscription]
impl SubscriptionShard_GlobalData {
    async fn globalData<'a>(&self, ctx: &'a Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_GlobalData> + 'a {
        handle_generic_gql_collection_request::<GlobalData, GQLSet_GlobalData>(ctx, "globalData", filter).await
    }
    async fn globalDatum<'a>(&self, ctx: &'a Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<GlobalData>> + 'a {
        handle_generic_gql_doc_request::<GlobalData, GQLSet_GlobalData>(ctx, "globalData", &id).await
    }
}