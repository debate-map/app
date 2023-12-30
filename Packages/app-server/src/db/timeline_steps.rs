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

use crate::utils::db::accessors::get_db_entries;
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::general::order_key::OrderKey;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entry}}};

use super::_shared::access_policy_target::AccessPolicyTarget;
use super::_shared::attachments::Attachment;
use super::commands::_command::{FieldUpdate, FieldUpdate_Nullable};
use super::{node_revisions::{get_node_revision}};

pub async fn get_timeline_step(ctx: &AccessorContext<'_>, id: &str) -> Result<TimelineStep, Error> {
    get_db_entry(ctx, "timelineSteps", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_timeline_steps(ctx: &AccessorContext<'_>, timeline_id: &str) -> Result<Vec<TimelineStep>, Error> {
    get_db_entries(ctx, "timelineSteps", &Some(json!({
        "timelineID": {"equalTo": timeline_id}
    }))).await
}

wrap_slow_macros!{

// commented; these are the only options for now, but later we want the "group" to be a freeform field, eg. for marking which person is speaking for a given step
/*#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Hash, Debug)]
pub enum TimelineStepGroup {
    #[graphql(name = "full")] full,
    #[graphql(name = "left")] left,
    #[graphql(name = "right")] right,
    #[graphql(name = "center")] center,
}*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct TimelineStep {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
    pub timelineID: String,
    pub orderKey: OrderKey,
	pub groupID: String,
    pub timeFromStart: Option<f64>,
    pub timeFromLastStep: Option<f64>,
    pub timeUntilNextStep: Option<f64>,
	pub message: String,
    pub nodeReveals: Vec<NodeReveal>,
    #[graphql(name = "c_accessPolicyTargets")]
    pub c_accessPolicyTargets: Vec<AccessPolicyTarget>,
}
impl From<Row> for TimelineStep {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "NodeRevealInput")]
pub struct NodeReveal {
	path: String,
    show: Option<bool>,
    #[graphql(name = "show_revealDepth")]
    show_revealDepth: Option<f64>,
    changeFocusLevelTo: Option<i32>,
    setExpandedTo: Option<bool>,
    hide: Option<bool>,
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct TimelineStepInput {
    pub timelineID: String,
    pub orderKey: OrderKey,
    pub groupID: String,
    pub timeFromStart: Option<f64>,
    pub timeFromLastStep: Option<f64>,
    pub timeUntilNextStep: Option<f64>,
	pub message: String,
	pub nodeReveals: Vec<NodeReveal>,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct TimelineStepUpdates {
    pub orderKey: FieldUpdate<OrderKey>,
    pub groupID: FieldUpdate<String>,
	pub timeFromStart: FieldUpdate_Nullable<f64>,
	pub timeFromLastStep: FieldUpdate_Nullable<f64>,
	pub timeUntilNextStep: FieldUpdate_Nullable<f64>,
	pub message: FieldUpdate<String>,
	pub nodeReveals: FieldUpdate<Vec<NodeReveal>>,
}

#[derive(Clone)] pub struct GQLSet_TimelineStep { pub nodes: Vec<TimelineStep> }
#[Object] impl GQLSet_TimelineStep { async fn nodes(&self) -> &Vec<TimelineStep> { &self.nodes } }
impl GQLSet<TimelineStep> for GQLSet_TimelineStep {
    fn from(entries: Vec<TimelineStep>) -> GQLSet_TimelineStep { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<TimelineStep> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_TimelineStep;
#[Subscription]
impl SubscriptionShard_TimelineStep {
    async fn timelineSteps<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_TimelineStep, SubError>> + 'a {
        handle_generic_gql_collection_request::<TimelineStep, GQLSet_TimelineStep>(ctx, "timelineSteps", filter).await
    }
    async fn timelineStep<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<TimelineStep>, SubError>> + 'a {
        handle_generic_gql_doc_request::<TimelineStep>(ctx, "timelineSteps", id).await
    }
}

}