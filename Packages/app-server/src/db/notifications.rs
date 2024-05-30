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

pub async fn get_notification(ctx: &AccessorContext<'_>, id: &str) -> Result<Notification, Error> {
    get_db_entry(ctx, "notifications", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

#[derive(SimpleObject, Clone, Serialize, Deserialize,Debug)]
pub struct Notification {
    pub id: ID,
    pub user: String,
    pub commandRun: String,
    pub readTime: Option<i64>,
}

#[derive(InputObject, Serialize, Deserialize,Debug)]
pub struct NotificationUpdateReadInput {
    pub readTime: Option<i64>,
}

impl From<Row> for Notification {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(Clone)] pub struct GQLSet_Notification { pub nodes: Vec<Notification> }
#[Object] impl GQLSet_Notification { async fn nodes(&self) -> &Vec<Notification> { &self.nodes } }
impl GQLSet<Notification> for GQLSet_Notification {
    fn from(entries: Vec<Notification>) -> GQLSet_Notification { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Notification> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_Notification;
#[Object] impl QueryShard_Notification {
	async fn notifications(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<Notification>, GQLError> {
		handle_generic_gql_collection_query(ctx, "notifications", filter).await
	}
	async fn notification(&self, ctx: &Context<'_>, id: String) -> Result<Option<Notification>, GQLError> {
		handle_generic_gql_doc_query(ctx, "notifications", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_Notification;
#[Subscription] impl SubscriptionShard_Notification {
    async fn notifications<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Notification, SubError>> + 'a {
        handle_generic_gql_collection_subscription::<Notification, GQLSet_Notification>(ctx, "notifications", filter).await
    }
    async fn notification<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Notification>, SubError>> + 'a {
        handle_generic_gql_doc_subscription::<Notification>(ctx, "notifications", id).await
    }
}

}