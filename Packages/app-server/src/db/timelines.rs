use rust_shared::anyhow::Error;
use rust_shared::{SubError, serde_json, futures};
use rust_shared::async_graphql::{self, MaybeUndefined, Enum};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entry}}};

use super::_shared::attachments::Attachment;
use super::commands::_command::{FieldUpdate, FieldUpdate_Nullable};
use super::{node_revisions::{get_node_revision}};

pub async fn get_timeline(ctx: &AccessorContext<'_>, id: &str) -> Result<Timeline, Error> {
    get_db_entry(ctx, "timelines", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

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

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct TimelineInput {
    pub accessPolicy: String,
    pub mapID: String,
    pub name: String,
	pub videoID: Option<String>,
	pub videoStartTime: Option<f64>,
    pub videoHeightVSWidthPercent: Option<f64>,
	//pub extras: JSONValue, // to set this, use updateNode command instead (this consolidates/simplifies the subfield-sensitive validation code)
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct TimelineUpdates {
    pub accessPolicy: FieldUpdate<String>,
    pub name: FieldUpdate<String>,
    pub videoID: FieldUpdate_Nullable<String>,
    pub videoStartTime: FieldUpdate_Nullable<f64>,
    pub videoHeightVSWidthPercent: FieldUpdate_Nullable<f64>,
	//pub extras: FieldUpdate<JSONValue>,
}

/*#[derive(Clone, Serialize, Deserialize)]
pub struct Timeline_Extras {
}*/

#[derive(Clone)] pub struct GQLSet_Timeline { pub nodes: Vec<Timeline> }
#[Object] impl GQLSet_Timeline { async fn nodes(&self) -> &Vec<Timeline> { &self.nodes } }
impl GQLSet<Timeline> for GQLSet_Timeline {
    fn from(entries: Vec<Timeline>) -> GQLSet_Timeline { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Timeline> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_Timeline;
#[Subscription]
impl SubscriptionShard_Timeline {
    async fn timelines<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Timeline, SubError>> + 'a {
        handle_generic_gql_collection_request::<Timeline, GQLSet_Timeline>(ctx, "timelines", filter).await
    }
    async fn timeline<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Timeline>, SubError>> + 'a {
        handle_generic_gql_doc_request::<Timeline>(ctx, "timelines", id).await
    }
}

}