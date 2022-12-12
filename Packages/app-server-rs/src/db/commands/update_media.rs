use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::utils::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable};
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_update};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::medias::{Media, MediaInput, get_media, MediaUpdates};
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct};

wrap_slow_macros!{

#[derive(InputObject, Deserialize)]
pub struct UpdateMediaInput {
	id: String,
	updates: MediaUpdates,
}

#[derive(SimpleObject, Debug)]
pub struct UpdateMediaResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

#[derive(Default)]
pub struct MutationShard_UpdateMedia;
#[Object]
impl MutationShard_UpdateMedia {
	async fn update_media(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateMediaInput) -> Result<UpdateMediaResult, Error> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_write(&mut anchor, gql_ctx).await?;
		let user_info = get_user_info_from_gql_ctx(&gql_ctx, &ctx).await?;
		let UpdateMediaInput { id, updates } = input;
		let result = UpdateMediaResult { __: gql_placeholder() };
		
		let old_data = get_media(&ctx, &id).await?;
		assert_user_can_update(&ctx, &user_info, &old_data.creator, &old_data.accessPolicy).await?;
		let new_data = Media {
			accessPolicy: update_field(updates.accessPolicy, old_data.accessPolicy),
			name: update_field(updates.name, old_data.name),
			r#type: update_field(updates.r#type, old_data.r#type),
			url: update_field(updates.url, old_data.url),
			description: update_field(updates.description, old_data.description),
			..old_data
		};

		set_db_entry_by_id_for_struct(&ctx, "medias".to_owned(), id.to_string(), new_data).await?;

		ctx.tx.commit().await?;
		info!("Command completed! Result:{:?}", result);
		Ok(result)
    }
}

}