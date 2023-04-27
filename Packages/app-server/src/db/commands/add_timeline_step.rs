use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::commands::_command::command_boilerplate;
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::timeline_steps::{TimelineStep, TimelineStepInput};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_AddTimelineStep;
#[Object] impl MutationShard_AddTimelineStep {
	async fn add_timeline_step(&self, gql_ctx: &async_graphql::Context<'_>, input: AddTimelineStepInput, only_validate: Option<bool>) -> Result<AddTimelineStepResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_timeline_step);
    }
}

#[derive(InputObject, Deserialize)]
pub struct AddTimelineStepInput {
	pub timeline_step: TimelineStepInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddTimelineStepResult {
	pub id: String,
}

}

pub async fn add_timeline_step(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddTimelineStepInput, _extras: NoExtras) -> Result<AddTimelineStepResult, Error> {
	let AddTimelineStepInput { timeline_step: timeline_step_ } = input;
	
	let timeline_step = TimelineStep {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		// pass-through
		timelineID: timeline_step_.timelineID,
		orderKey: timeline_step_.orderKey,
		groupID: timeline_step_.groupID,
		timeFromStart: timeline_step_.timeFromStart,
		timeFromLastStep: timeline_step_.timeFromLastStep,
		message: timeline_step_.message,
		nodeReveals: timeline_step_.nodeReveals,
		c_accessPolicyTargets: vec![], // auto-set by db
	};

	upsert_db_entry_by_id_for_struct(&ctx, "timelineSteps".to_owned(), timeline_step.id.to_string(), timeline_step.clone()).await?;

	Ok(AddTimelineStepResult { id: timeline_step.id.to_string() })
}