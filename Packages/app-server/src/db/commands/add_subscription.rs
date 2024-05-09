use std::ops::Sub;
use rust_shared::{async_graphql::{InputObject, Object, SimpleObject, ID}, utils::{db::uuid::new_uuid_v4_as_b64, general_::extensions::ToOwnedV}, GQLError};
use serde::{Deserialize, Serialize};
use crate::db::{commands::_command::{command_boilerplate, insert_db_entry_by_id_for_struct}, general::permission_helpers::assert_user_can_add_child, nodes::get_node, subscriptions::Subscription, users::User};
use rust_shared::{async_graphql,serde_json};
use crate::utils::db::accessors::AccessorContext;
use rust_shared::anyhow::{anyhow, Error, Context};
use super::_command::NoExtras;



#[derive(InputObject, Deserialize, Serialize, Clone)]
pub struct AddSubscriptionInput {
    pub node: String,
    pub eventType: String
}

#[derive(SimpleObject, Debug, Serialize)]
pub struct AddSubscriptionResult {
    pub id: String,
    pub node: String,
    pub eventType: String
}


#[derive(Default)] pub struct MutationShard_AddSubscription;
#[Object] impl MutationShard_AddSubscription {
    async fn add_subscription(&self, gql_ctx: &async_graphql::Context<'_>, input: AddSubscriptionInput, only_validate: Option<bool>) -> Result<AddSubscriptionResult, GQLError> {
        command_boilerplate!(gql_ctx, input, only_validate, add_subscription);
    }
}

pub async fn add_subscription(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddSubscriptionInput, _extras: NoExtras) -> Result<AddSubscriptionResult, Error> {
    let AddSubscriptionInput { eventType, node: nodeID  } = input.clone();
    
    let subscription = Subscription {
        id: ID(new_uuid_v4_as_b64()),
        eventType: eventType,
        node: nodeID,
        user: actor.id.to_string()
    };
    
	insert_db_entry_by_id_for_struct(&ctx, "subscriptions".o(), subscription.id.to_string(), subscription.clone()).await?;

    
    Ok(AddSubscriptionResult {
        id: subscription.id.to_string(),
        node: subscription.node.to_string(),
        eventType: subscription.eventType
    })
}