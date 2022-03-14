use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_async_graphql;
use serde::{Serialize, Deserialize};
use tokio_postgres::{Client};

use crate::utils::general::{handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};
use crate::utils::filter::{Filter};

wrap_async_graphql!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct NodeChildLink {
    id: ID,
	creator: String,
	createdAt: i64,
	parent: String,
	child: String,
	group: String,
	orderKey: String,
	form: Option<String>,
	seriesAnchor: Option<bool>,
	seriesEnd: Option<bool>,
	polarity: Option<String>,
    #[graphql(name = "c_parentType")]
	c_parentType: Option<String>,
    #[graphql(name = "c_childType")]
	c_childType: Option<String>,
}
impl From<tokio_postgres::row::Row> for NodeChildLink {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            parent: row.get("parent"),
            child: row.get("child"),
            group: row.get("group"),
            orderKey: row.get("orderKey"),
            form: row.get("form"),
            seriesAnchor: row.get("seriesAnchor"),
            seriesEnd: row.get("seriesEnd"),
            polarity: row.get("polarity"),
            c_parentType: row.get("c_parentType"),
            c_childType: row.get("c_childType"),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_NodeChildLink { nodes: Vec<NodeChildLink> }
#[Object] impl GQLSet_NodeChildLink { async fn nodes(&self) -> &Vec<NodeChildLink> { &self.nodes } }
impl GQLSet<NodeChildLink> for GQLSet_NodeChildLink {
    fn from(entries: Vec<NodeChildLink>) -> GQLSet_NodeChildLink { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<NodeChildLink> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_NodeChildLink;
#[Subscription]
impl SubscriptionShard_NodeChildLink {
    async fn nodeChildLinks<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Filter) -> impl Stream<Item = GQLSet_NodeChildLink> + 'a {
        handle_generic_gql_collection_request::<NodeChildLink, GQLSet_NodeChildLink>(ctx, "nodeChildLinks", filter).await
    }
    async fn nodeChildLink<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Filter) -> impl Stream<Item = Option<NodeChildLink>> + 'a {
        handle_generic_gql_doc_request::<NodeChildLink>(ctx, "nodeChildLinks", id).await
    }
}

}