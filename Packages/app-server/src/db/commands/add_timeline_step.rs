use graphlink_rust::{new_uuid_v4_as_b64, time_since_epoch_ms_i64, AccessorContext, DataAnchorFor1, GQLError};
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Value};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow, async_graphql, serde_json};
use tracing::info;

use crate::db::commands::_command::command_boilerplate;
use crate::db::general::permission_helpers::assert_user_can_modify;
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::timeline_steps::{timeline_step_extras_locked_subfields, TimelineStep, TimelineStepInput};
use crate::db::timelines::get_timeline;
use crate::db::users::User;

use super::_command::{init_field_of_extras, update_field_of_extras, upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_AddTimelineStep;
#[Object] impl MutationShard_AddTimelineStep {
	async fn add_timeline_step(&self, gql_ctx: &async_graphql::Context<'_>, input: AddTimelineStepInput, only_validate: Option<bool>) -> Result<AddTimelineStepResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_timeline_step);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddTimelineStepInput {
	pub step: TimelineStepInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddTimelineStepResult {
	pub id: String,
}

}

pub async fn add_timeline_step(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddTimelineStepInput, _extras: NoExtras) -> Result<AddTimelineStepResult, Error> {
	let AddTimelineStepInput { step: step_ } = input;
	let timeline = get_timeline(&ctx, &step_.timelineID).await?;
	assert_user_can_modify(&ctx, &actor, &timeline).await?;

	let timeline_step = TimelineStep {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		// pass-through
		timelineID: step_.timelineID,
		orderKey: step_.orderKey,
		groupID: step_.groupID,
		timeFromStart: step_.timeFromStart,
		timeFromLastStep: step_.timeFromLastStep,
		timeUntilNextStep: step_.timeUntilNextStep,
		message: step_.message,
		extras: init_field_of_extras(step_.extras, json!({}), timeline_step_extras_locked_subfields())?, // "extras" fields use special handling
		c_accessPolicyTargets: vec![],                                                                   // auto-set by db
	};

	upsert_db_entry_by_id_for_struct(&ctx, "timelineSteps".to_owned(), timeline_step.id.to_string(), timeline_step.clone()).await?;

	Ok(AddTimelineStepResult { id: timeline_step.id.to_string() })
}
