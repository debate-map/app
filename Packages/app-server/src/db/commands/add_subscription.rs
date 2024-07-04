use std::ops::Sub;
use rust_shared::{async_graphql::{InputObject, Object, SimpleObject, ID}, serde_json::json, utils::{db::uuid::new_uuid_v4_as_b64, general_::extensions::ToOwnedV, time::time_since_epoch_ms_i64}, GQLError};
use serde::{Deserialize, Serialize};
use crate::{db::{commands::_command::{command_boilerplate, insert_db_entry_by_id_for_struct, upsert_db_entry_by_id_for_struct}, general::permission_helpers::assert_user_can_add_child, nodes::get_node, subscriptions::{self, Subscription}, users::User}, utils::db::accessors::get_db_entry};
use rust_shared::{async_graphql,serde_json};
use crate::utils::db::accessors::AccessorContext;
use rust_shared::anyhow::{anyhow, Error, Context};
use super::_command::{delete_db_entry_by_id, NoExtras};



#[derive(InputObject, Deserialize, Serialize, Clone)]
pub struct AddSubscriptionInput {
    pub node: String,
    pub addChildNode: Option<bool>,
    pub deleteNode: Option<bool>,
    pub addNodeLink: Option<bool>,
    pub deleteNodeLink: Option<bool>,
    pub addNodeRevision: Option<bool>,
    pub setNodeRating: Option<bool>,
}

pub struct AddSubscriptionInputBuilder {
    pub node: String,
    pub addChildNode: Option<bool>,
    pub deleteNode: Option<bool>,
    pub addNodeLink: Option<bool>,
    pub deleteNodeLink: Option<bool>,
    pub addNodeRevision: Option<bool>,
    pub setNodeRating: Option<bool>,
}

impl AddSubscriptionInputBuilder {
    pub fn new(node: String) -> Self {
        Self {
            node,
            addChildNode: None,
            deleteNode: None,
            addNodeLink: None,
            deleteNodeLink: None,
            addNodeRevision: None,
            setNodeRating: None,
        }
    }

    pub fn build(self) -> AddSubscriptionInput {
        AddSubscriptionInput {
            node: self.node,
            addChildNode: self.addChildNode,
            deleteNode: self.deleteNode,
            addNodeLink: self.addNodeLink,
            deleteNodeLink: self.deleteNodeLink,
            addNodeRevision: self.addNodeRevision,
            setNodeRating: self.setNodeRating,
        }
    }

    pub fn with_add_child_node(mut self, value: bool) -> Self {
        self.addChildNode = Some(value);
        self
    }

    pub fn with_delete_node(mut self, value: bool) -> Self {
        self.deleteNode = Some(value);
        self
    }

    pub fn with_add_node_link(mut self, value: bool) -> Self {
        self.addNodeLink = Some(value);
        self
    }

    pub fn with_delete_node_link(mut self, value: bool) -> Self {
        self.deleteNodeLink = Some(value);
        self
    }

    pub fn with_add_node_revision(mut self, value: bool) -> Self {
        self.addNodeRevision = Some(value);
        self
    }

    pub fn with_set_node_rating(mut self, value: bool) -> Self {
        self.setNodeRating = Some(value);
        self
    }
}

#[derive(SimpleObject, Debug, Serialize)]
pub struct AddSubscriptionResult {
    pub id: String,
    pub user: String,
    pub node: String,
    pub addChildNode: bool,
    pub deleteNode: bool,
    pub addNodeLink: bool,
    pub deleteNodeLink: bool,
    pub addNodeRevision: bool,
    pub setNodeRating: bool,
}


#[derive(Default)] pub struct MutationShard_AddSubscription;
#[Object] impl MutationShard_AddSubscription {
    async fn add_subscription(&self, gql_ctx: &async_graphql::Context<'_>, input: AddSubscriptionInput, only_validate: Option<bool>) -> Result<AddSubscriptionResult, GQLError> {
        command_boilerplate!(gql_ctx, input, only_validate, add_or_update_subscription);
    }
}

pub async fn add_or_update_subscription(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddSubscriptionInput, _extras: NoExtras) -> Result<AddSubscriptionResult, Error> {
    let AddSubscriptionInput { node: nodeID, addChildNode, deleteNode, addNodeLink, deleteNodeLink, addNodeRevision, setNodeRating   } = input.clone();
    

    let existing_subscription = get_db_entry::<Subscription>(&ctx,"subscriptions", &Some(json!({
        "node": {"equalTo": nodeID},
        "user": {"equalTo": actor.id.to_string()}
    }))).await;

    if let Ok(mut subscription) = existing_subscription {
        subscription.addChildNode = addChildNode.unwrap_or(subscription.addChildNode);
        subscription.addNodeLink = addNodeLink.unwrap_or(subscription.addNodeLink);
        subscription.deleteNode = deleteNode.unwrap_or(subscription.deleteNode);
        subscription.deleteNodeLink = deleteNodeLink.unwrap_or(subscription.deleteNodeLink);
        subscription.addNodeRevision = addNodeRevision.unwrap_or(subscription.addNodeRevision);
        subscription.setNodeRating = setNodeRating.unwrap_or(subscription.setNodeRating);
        subscription.updatedAt = time_since_epoch_ms_i64();

        if !subscription.addChildNode && !subscription.addNodeLink && !subscription.deleteNode && !subscription.deleteNodeLink && !subscription.addNodeRevision && !subscription.setNodeRating {
            delete_db_entry_by_id(&ctx,"subscriptions".o() , subscription.id.to_string()).await?;
        } else {
            upsert_db_entry_by_id_for_struct(&ctx, "subscriptions".o(), subscription.id.to_string(), subscription.clone()).await?;
        }

        Ok(AddSubscriptionResult {
            id: subscription.id.to_string(),
            node: subscription.node.to_string(),
            user: subscription.user.to_string(),
            addChildNode: subscription.addChildNode,
            addNodeLink: subscription.addNodeLink,
            deleteNode: subscription.deleteNode,
            deleteNodeLink: subscription.deleteNodeLink,
            addNodeRevision: subscription.addNodeRevision,
            setNodeRating: subscription.setNodeRating,
        })

    } else {
        let subscription = Subscription {
            id: ID(new_uuid_v4_as_b64()),
            node: nodeID,
            user: actor.id.to_string(),
            addChildNode: addChildNode.unwrap_or(false),
            addNodeLink: addNodeLink.unwrap_or(false),
            deleteNode: deleteNode.unwrap_or(false),
            deleteNodeLink: deleteNodeLink.unwrap_or(false),
            addNodeRevision: addNodeRevision.unwrap_or(false),
            setNodeRating: setNodeRating.unwrap_or(false),
            createdAt: time_since_epoch_ms_i64(),
            updatedAt: time_since_epoch_ms_i64(),
        };
        
        if subscription.addChildNode || subscription.addNodeLink || subscription.deleteNode || subscription.deleteNodeLink || subscription.addNodeRevision || subscription.setNodeRating {
            insert_db_entry_by_id_for_struct(&ctx, "subscriptions".o(), subscription.id.to_string(), subscription.clone()).await?;
        }

        Ok(AddSubscriptionResult {
            id: subscription.id.to_string(),
            node: subscription.node.to_string(),
            user: subscription.user.to_string(),
            addChildNode: subscription.addChildNode,
            addNodeLink: subscription.addNodeLink,
            deleteNode: subscription.deleteNode,
            deleteNodeLink: subscription.deleteNodeLink,
            addNodeRevision: subscription.addNodeRevision,
            setNodeRating: subscription.setNodeRating,
        })
    }
}