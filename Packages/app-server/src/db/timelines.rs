use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::anyhow::Error;
use rust_shared::async_graphql::{self, Enum, MaybeUndefined};
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::{futures, serde_json, GQLError, SubError};

use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::{
	accessors::{get_db_entry, AccessorContext},
	filter::FilterInput,
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};

use super::_shared::attachments::Attachment;
use super::commands::_command::{CanNullOrOmit, CanOmit};
use super::node_revisions::get_node_revision;

#[rustfmt::skip]
pub async fn get_timeline(ctx: &AccessorContext<'_>, id: &str) -> Result<Timeline, Error> {
    get_db_entry(ctx, "timelines", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros! {

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Timeline {
	pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub accessPolicy: String,
	pub mapID: String,
	pub name: String,
	pub videoID: Option<String>,
	pub videoStartTime: Option<f64>,
	pub videoHeightVSWidthPercent: Option<f64>,
	//pub extras: JSONValue,
}
/*impl Timeline {
	pub fn extras_known(&self) -> Result<Timeline_Extras, Error> {
		Ok(serde_json::from_value(self.extras.clone())?)
	}
}*/
impl From<Row> for Timeline {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

/*#[derive(Clone, Serialize, Deserialize)]
pub struct Timeline_Extras {
}*/

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct TimelineInput {
	pub accessPolicy: String,
	pub mapID: String,
	pub name: String,
	pub videoID: Option<String>,
	pub videoStartTime: Option<f64>,
	pub videoHeightVSWidthPercent: Option<f64>,
	//pub extras: JSONValue,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct TimelineUpdates {
	pub accessPolicy: CanOmit<String>,
	pub name: CanOmit<String>,
	pub videoID: CanNullOrOmit<String>,
	pub videoStartTime: CanNullOrOmit<f64>,
	pub videoHeightVSWidthPercent: CanNullOrOmit<f64>,
	//pub extras: FieldUpdate<JSONValue>,
}

#[derive(Clone)] pub struct GQLSet_Timeline { pub nodes: Vec<Timeline> }
#[Object] impl GQLSet_Timeline { async fn nodes(&self) -> &Vec<Timeline> { &self.nodes } }
impl GQLSet<Timeline> for GQLSet_Timeline {
	fn from(entries: Vec<Timeline>) -> GQLSet_Timeline { Self { nodes: entries } }
	fn nodes(&self) -> &Vec<Timeline> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_Timeline;
#[Object] impl QueryShard_Timeline {
	async fn timelines(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<Timeline>, GQLError> {
		handle_generic_gql_collection_query(ctx, "timelines", filter).await
	}
	async fn timeline(&self, ctx: &Context<'_>, id: String) -> Result<Option<Timeline>, GQLError> {
		handle_generic_gql_doc_query(ctx, "timelines", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_Timeline;
#[Subscription] impl SubscriptionShard_Timeline {
	async fn timelines<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Timeline, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<Timeline, GQLSet_Timeline>(ctx, "timelines", filter, None).await
	}
	async fn timeline<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Timeline>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<Timeline>(ctx, "timelines", id).await
	}
}

}
