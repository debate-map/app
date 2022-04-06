use rust_shared::SubError;
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
pub struct MapNodeTag {
    pub id: ID,
    pub creator: String,
    pub createdAt: i64,
    pub nodes: Vec<String>,
    pub labels: Option<serde_json::Value>,
    pub mirrorChildrenFromXToY: Option<serde_json::Value>,
    pub xIsExtendedByY: Option<serde_json::Value>,
    pub mutuallyExclusiveGroup: Option<serde_json::Value>,
    pub restrictMirroringOfX: Option<serde_json::Value>,
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

#[derive(Clone)] pub struct GQLSet_MapNodeTag { nodes: Vec<MapNodeTag> }
#[Object] impl GQLSet_MapNodeTag { async fn nodes(&self) -> &Vec<MapNodeTag> { &self.nodes } }
impl GQLSet<MapNodeTag> for GQLSet_MapNodeTag {
    fn from(entries: Vec<MapNodeTag>) -> GQLSet_MapNodeTag { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<MapNodeTag> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_MapNodeTag;
#[Subscription]
impl SubscriptionShard_MapNodeTag {
    async fn nodeTags<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_MapNodeTag, SubError>> + 'a {
        handle_generic_gql_collection_request::<MapNodeTag, GQLSet_MapNodeTag>(ctx, "nodeTags", filter).await
    }
    async fn nodeTag<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Option<FilterInput>) -> impl Stream<Item = Result<Option<MapNodeTag>, SubError>> + 'a {
        handle_generic_gql_doc_request::<MapNodeTag>(ctx, "nodeTags", id).await
    }
}

}
