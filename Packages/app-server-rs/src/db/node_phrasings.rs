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

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

use crate::utils::db::accessors::{get_db_entry, AccessorContext, get_db_entries};

pub async fn get_node_phrasings(ctx: &AccessorContext<'_>, node_id: &str) -> Result<Vec<MapNodePhrasing>, Error> {
    get_db_entries(ctx, "nodePhrasings", &Some(json!({
        "node": {"equalTo": node_id}
    }))).await
}

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MapNodePhrasing {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub node: String,
	pub r#type: String,
    #[graphql(name = "text_base")]
	pub text_base: String,
    #[graphql(name = "text_negation")]
	pub text_negation: Option<String>,
    #[graphql(name = "text_question")]
	pub text_question: Option<String>,
	pub note: Option<String>,
	pub terms: Vec<serde_json::Value>,
	pub references: Vec<String>,
}
impl From<Row> for MapNodePhrasing {
	fn from(row: Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            node: row.get("node"),
            r#type: row.get("type"),
            text_base: row.get("text_base"),
            text_negation: row.get("text_negation"),
            text_question: row.get("text_question"),
            note: row.get("note"),
            terms: row.get("terms"),
            references: row.get("references"),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_MapNodePhrasing { nodes: Vec<MapNodePhrasing> }
#[Object] impl GQLSet_MapNodePhrasing { async fn nodes(&self) -> &Vec<MapNodePhrasing> { &self.nodes } }
impl GQLSet<MapNodePhrasing> for GQLSet_MapNodePhrasing {
    fn from(entries: Vec<MapNodePhrasing>) -> GQLSet_MapNodePhrasing { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<MapNodePhrasing> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_MapNodePhrasing;
#[Subscription]
impl SubscriptionShard_MapNodePhrasing {
    async fn nodePhrasings<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_MapNodePhrasing, SubError>> + 'a {
        handle_generic_gql_collection_request::<MapNodePhrasing, GQLSet_MapNodePhrasing>(ctx, "nodePhrasings", filter).await
    }
    async fn nodePhrasing<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<MapNodePhrasing>, SubError>> + 'a {
        handle_generic_gql_doc_request::<MapNodePhrasing>(ctx, "nodePhrasings", id).await
    }
}

}