use rust_shared::anyhow::Error;
use rust_shared::{SubError, serde_json};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, pg_row_to_json::{postgres_row_to_json_value, postgres_row_to_struct}}};

use crate::utils::db::accessors::{get_db_entry, AccessorContext, get_db_entries};

/*extern crate tokio_pg_mapper_derive;
extern crate tokio_pg_mapper;
use tokio_pg_mapper::FromTokioPostgresRow;
use tokio_pg_mapper_derive::PostgresMapper;*/

pub async fn get_tags_for(ctx: &AccessorContext<'_>, node_id: &str) -> Result<Vec<MapNodeTag>, Error> {
    get_db_entries(ctx, "nodeTags", &Some(json!({
        "nodes": {"contains": [node_id]}
    }))).await
}

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize, /*PostgresMapper*/)]
//#[pg_mapper(table = "nodeTags")] // idk why this is needed, but whatever
pub struct MapNodeTag {
    pub id: ID,
    pub creator: String,
    pub createdAt: i64,
    pub nodes: Vec<String>,
    pub labels: Option<TagComp_Labels>,
    pub mirrorChildrenFromXToY: Option<serde_json::Value>,
    pub xIsExtendedByY: Option<serde_json::Value>,
    pub mutuallyExclusiveGroup: Option<serde_json::Value>,
    pub restrictMirroringOfX: Option<serde_json::Value>,
    pub cloneHistory: Option<TagComp_CloneHistory>,
}
/*impl From<Row> for MapNodeTag {
    fn from(row: Row) -> Self {
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
            cloneHistory: row.get("cloneHistory"),
        }
    }
}*/
impl From<Row> for MapNodeTag {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
#[graphql(name = "TagComp_Labels")]
pub struct TagComp_Labels {
	pub nodeX: String,
	pub labels: Vec<String>,
}
/*impl From<Row> for TagComp_Labels {
    fn from(row: Row) -> Self { postgres_row_to_struct(row) }
}*/
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
#[graphql(name = "TagComp_CloneHistory")]
pub struct TagComp_CloneHistory {
    pub cloneChain: Vec<String>,
}
/*impl From<Row> for TagComp_CloneHistory {
    fn from(row: Row) -> Self { postgres_row_to_struct(row) }
}*/

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