use super::_command::NoExtras;
use graphlink_rust::{get_db_entry, new_uuid_v4_as_b64, AccessorContext, GQLError, ToOwnedV};
use crate::db::{
	commands::_command::{command_boilerplate, insert_db_entry_by_id_for_struct, upsert_db_entry_by_id_for_struct},
	general::permission_helpers::assert_user_can_add_child,
	nodes::get_node,
	notifications::{self, Notification},
	users::User,
};
use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::{async_graphql, serde_json};
use rust_shared::{
	async_graphql::{InputObject, Object, SimpleObject, ID},
	serde_json::json,
};
use serde::{Deserialize, Serialize};
use std::ops::Sub;

#[derive(InputObject, Deserialize, Serialize, Clone)]
pub struct AddNotificationInput {
    pub commandRun: String,
    pub user: String,
    pub readTime: Option<i64>,
}

#[derive(SimpleObject, Debug, Serialize)]
pub struct AddNotificationResult {
    pub id: String,
    pub user: String,
    pub commandRun: String,
    pub readTime: Option<i64>,
}

#[derive(Default)]
pub struct MutationShard_AddNotification;
#[Object]
impl MutationShard_AddNotification {
    async fn add_notification(
        &self,
        gql_ctx: &async_graphql::Context<'_>,
        input: AddNotificationInput,
        only_validate: Option<bool>,
    ) -> Result<AddNotificationResult, GQLError> {
        command_boilerplate!(gql_ctx, input, only_validate, add_notification);
    }
}

pub async fn add_notification(
    ctx: &AccessorContext<'_>,
    _actor: &User,
    _is_root: bool,
    input: AddNotificationInput,
    _extras: NoExtras,
) -> Result<AddNotificationResult, Error> {
    let AddNotificationInput {
        commandRun,
        user,
        readTime,
    } = input.clone();


    let notification = Notification {
        id: ID(new_uuid_v4_as_b64()),
        user,
        commandRun,
        readTime,
    };

    insert_db_entry_by_id_for_struct(
        &ctx,
        "notifications".o(),
        notification.id.to_string(),
        notification.clone(),
    )
    .await?;

    Ok(AddNotificationResult {
        id: notification.id.to_string(),
        user: notification.user,
        commandRun: notification.commandRun,
        readTime: notification.readTime,
    })
}
