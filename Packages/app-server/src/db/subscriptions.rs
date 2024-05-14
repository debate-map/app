use rust_shared::anyhow::Error;
use rust_shared::serde_json::json;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json, GQLError};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::accessors::{AccessorContext, get_db_entry};
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_doc_query, handle_generic_gql_collection_query};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{generic_handlers::{subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet}}, filter::FilterInput}};

use super::commands::_command::{CanNullOrOmit, CanOmit};

pub async fn get_subscriptions(ctx: &AccessorContext<'_>, id: &str) -> Result<Subscription, Error> {
    get_db_entry(ctx, "subscriptions", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub id: ID,
    pub user: String,
    pub node: String,
    pub addChildNode: bool,
    pub deleteNode: bool,
    pub addNodeLink: bool,
    pub deleteNodeLink: bool,
    pub addNodeRevision: bool,
    pub setNodeRating: bool,
}
impl From<Row> for Subscription {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(Clone)] pub struct GQLSet_Subscription { pub nodes: Vec<Subscription> }
#[Object] impl GQLSet_Subscription { async fn nodes(&self) -> &Vec<Subscription> { &self.nodes } }
impl GQLSet<Subscription> for GQLSet_Subscription {
    fn from(entries: Vec<Subscription>) -> GQLSet_Subscription { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Subscription> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_Subscription;
#[Object] impl QueryShard_Subscription {
	async fn subscriptions(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<Subscription>, GQLError> {
		handle_generic_gql_collection_query(ctx, "subscriptions", filter).await
	}
	async fn subscription(&self, ctx: &Context<'_>, id: String) -> Result<Option<Subscription>, GQLError> {
		handle_generic_gql_doc_query(ctx, "subscriptions", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_Subscription;
#[Subscription] impl SubscriptionShard_Subscription {
    async fn subscriptions<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Subscription, SubError>> + 'a {
        handle_generic_gql_collection_subscription::<Subscription, GQLSet_Subscription>(ctx, "subscriptions", filter).await
    }
    async fn subscription<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Subscription>, SubError>> + 'a {
        handle_generic_gql_doc_subscription::<Subscription>(ctx, "subscriptions", id).await
    }
}

}