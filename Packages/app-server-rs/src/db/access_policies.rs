use std::panic;

use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};

#[derive(SimpleObject, Clone)]
pub struct AccessPolicy {
    id: ID,
	creator: String,
	createdAt: i64,
    name: String,
    permissions: serde_json::Value,
    #[graphql(name = "permissions_userExtends")]
    permissions_userExtends: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for AccessPolicy {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            name: row.get("name"),
            permissions: serde_json::from_value(row.get("permissions")).unwrap(),
            permissions_userExtends: serde_json::from_value(row.get("permissions_userExtends")).unwrap(),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_AccessPolicy { nodes: Vec<AccessPolicy> }
#[Object] impl GQLSet_AccessPolicy { async fn nodes(&self) -> &Vec<AccessPolicy> { &self.nodes } }
impl GQLSet<AccessPolicy> for GQLSet_AccessPolicy {
    fn from(entries: Vec<AccessPolicy>) -> GQLSet_AccessPolicy { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<AccessPolicy> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_AccessPolicy;
#[Subscription]
impl SubscriptionShard_AccessPolicy {
    async fn accessPolicies<'a>(&self, ctx: &'a Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_AccessPolicy> + 'a {
        handle_generic_gql_collection_request::<AccessPolicy, GQLSet_AccessPolicy>(ctx, "accessPolicies", filter).await
    }
    async fn accessPolicy<'a>(&self, ctx: &'a Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<AccessPolicy>> + 'a {
        handle_generic_gql_doc_request::<AccessPolicy, GQLSet_AccessPolicy>(ctx, "accessPolicies", &id).await
    }
}