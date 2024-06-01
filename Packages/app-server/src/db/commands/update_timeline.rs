use rust_shared::anyhow::{anyhow, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Value};
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow, async_graphql, serde_json, GQLError};
use tracing::info;

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{command_boilerplate, delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable};
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_modify};
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::timelines::{get_timeline, Timeline, TimelineInput, TimelineUpdates};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_UpdateTimeline;
#[Object] impl MutationShard_UpdateTimeline {
	async fn update_timeline(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateTimelineInput, only_validate: Option<bool>) -> Result<UpdateTimelineResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_timeline);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct UpdateTimelineInput {
	pub id: String,
	pub updates: TimelineUpdates,
}

#[derive(SimpleObject, Debug)]
pub struct UpdateTimelineResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn update_timeline(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: UpdateTimelineInput, _extras: NoExtras) -> Result<UpdateTimelineResult, Error> {
	let UpdateTimelineInput { id, updates } = input;

	let old_data = get_timeline(&ctx, &id).await?;
	assert_user_can_modify(&ctx, &actor, &old_data).await?;
	let new_data = Timeline {
		accessPolicy: update_field(updates.accessPolicy, old_data.accessPolicy),
		name: update_field(updates.name, old_data.name),
		videoID: update_field_nullable(updates.videoID, old_data.videoID),
		videoStartTime: update_field_nullable(updates.videoStartTime, old_data.videoStartTime),
		videoHeightVSWidthPercent: update_field_nullable(updates.videoHeightVSWidthPercent, old_data.videoHeightVSWidthPercent),
		..old_data
	};

	upsert_db_entry_by_id_for_struct(&ctx, "timelines".to_owned(), id.to_string(), new_data).await?;

	Ok(UpdateTimelineResult { __: gql_placeholder() })
}
