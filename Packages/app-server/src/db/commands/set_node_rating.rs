use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general_::extensions::{ToOwnedV};
use rust_shared::utils::general_::serde::to_json_value_for_borrowed_obj;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, ensure};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Serialize, Deserialize};
use tracing::info;

use crate::db::_shared::common_errors::err_should_be_populated;
use crate::db::commands::_shared::record_command_run::record_command_run_if_root;
use crate::db::commands::_shared::update_node_rating_summaries::update_node_rating_summaries;
use crate::db::commands::delete_node_rating::{delete_node_rating, DeleteNodeRatingInput};
use crate::db::general::permission_helpers::assert_user_can_vote;
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_ratings::{NodeRating, NodeRatingInput, get_node_ratings};
use crate::db::node_ratings_::_node_rating_type::NodeRatingType;
use crate::db::nodes::get_node;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{upsert_db_entry_by_id_for_struct, command_boilerplate, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_SetNodeRating;
#[Object] impl MutationShard_SetNodeRating {
	async fn set_node_rating(&self, gql_ctx: &async_graphql::Context<'_>, input: SetNodeRatingInput, only_validate: Option<bool>) -> Result<SetNodeRatingResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, set_node_rating);
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct SetNodeRatingInput {
	pub rating: NodeRatingInput,
}

#[derive(SimpleObject, Debug,Serialize, Deserialize)]
pub struct SetNodeRatingResult {
	pub id: String,
}

}

pub async fn set_node_rating(ctx: &AccessorContext<'_>, actor: &User, is_root: bool, input: SetNodeRatingInput, _extras: NoExtras) -> Result<SetNodeRatingResult, Error> {
	let SetNodeRatingInput { rating: rating_ } = input;
	
	ensure!(rating_.r#type != NodeRatingType::impact, "Cannot set impact rating directly.");
	let node = get_node(ctx, &rating_.node).await?;
	assert_user_can_vote(ctx, actor, &node).await?;

	let old_ratings = get_node_ratings(ctx, &rating_.node, Some(rating_.r#type), Some(&vec![actor.id.to_string()])).await?;
	for old_rating in old_ratings {
		delete_node_rating(ctx, actor, false, DeleteNodeRatingInput { id: old_rating.id.to_string() }, Default::default()).await?;
	}

	let rating = NodeRating {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		// pass-through
		accessPolicy: rating_.accessPolicy,
		node: rating_.node,
		r#type: rating_.r#type,
		value: rating_.value,
		c_accessPolicyTargets: vec![], // auto-set by db
	};

	upsert_db_entry_by_id_for_struct(&ctx, "nodeRatings".o(), rating.id.to_string(), rating.clone()).await?;

	update_node_rating_summaries(ctx, actor, rating.node.clone(), rating.r#type).await?;

	let result = SetNodeRatingResult { id: rating.id.to_string() };

	let input = json!({ 
		"createdAt": rating.createdAt,
		"node": rating.node.clone(),
		"type": rating.r#type
	 });

	record_command_run_if_root(
		ctx, actor, is_root,
		"setNodeRating".to_owned(), input, to_json_value_for_borrowed_obj(&result)?,
		vec![rating.node]
	).await?;

	Ok(result)
}