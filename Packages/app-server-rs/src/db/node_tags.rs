use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, apply_gql_filter};

#[derive(SimpleObject)]
pub struct MapNodeTag {
    id: ID,
	creator: String,
	createdAt: i64,
    nodes: Vec<String>,
	labels: Option<serde_json::Value>,
	mirrorChildrenFromXToY: Option<serde_json::Value>,
	xIsExtendedByY: Option<serde_json::Value>,
	mutuallyExclusiveGroup: Option<serde_json::Value>,
	restrictMirroringOfX: Option<serde_json::Value>,
}
impl From<tokio_postgres::row::Row> for MapNodeTag {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            nodes: row.get("nodes"),
            labels: row.get("labels"),
            mirrorChildrenFromXToY: row.get("mirrorChildrenFromXToY"),
            xIsExtendedByY: row.get("xIsExtendedByY"),
            mutuallyExclusiveGroup: row.get("mutuallyExclusiveGroup"),
            restrictMirroringOfX: row.get("restrictMirroringOfX"),
		}
	}
}

pub struct GQLSet_MapNodeTag<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_MapNodeTag<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_MapNodeTag;
#[Subscription]
impl SubscriptionShard_MapNodeTag {
    async fn nodeTags(&self, ctx: &Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_MapNodeTag<MapNodeTag>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"nodeTags\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"nodeTags\";", &[]).await.unwrap(),
        };
        let entries: Vec<MapNodeTag> = apply_gql_filter(&filter, rows.into_iter().map(|r| r.into()).collect());

        stream::once(async {
            GQLSet_MapNodeTag {
                nodes: entries, 
            }
        })
    }
    async fn nodeTag(&self, ctx: &Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<MapNodeTag>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.nodeTags(ctx, Some(id), filter)).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}