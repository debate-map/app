use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Serialize, Deserialize};
use tracing::info;

use crate::db::commands::_command::command_boilerplate;
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::timelines::{Timeline, TimelineInput};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_AddTimeline;
#[Object] impl MutationShard_AddTimeline {
	async fn add_timeline(&self, gql_ctx: &async_graphql::Context<'_>, input: AddTimelineInput, only_validate: Option<bool>) -> Result<AddTimelineResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_timeline);
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddTimelineInput {
	pub timeline: TimelineInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddTimelineResult {
	pub id: String,
}

}

pub async fn add_timeline(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddTimelineInput, _extras: NoExtras) -> Result<AddTimelineResult, Error> {
	let AddTimelineInput { timeline: timeline_ } = input;
	
	let timeline = Timeline {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		// pass-through
		accessPolicy: timeline_.accessPolicy,
		mapID: timeline_.mapID,
		name: timeline_.name,
		videoID: timeline_.videoID,
		videoStartTime: timeline_.videoStartTime,
		videoHeightVSWidthPercent: timeline_.videoHeightVSWidthPercent,
	};

	upsert_db_entry_by_id_for_struct(&ctx, "timelines".to_owned(), timeline.id.to_string(), timeline.clone()).await?;

	Ok(AddTimelineResult { id: timeline.id.to_string() })
}