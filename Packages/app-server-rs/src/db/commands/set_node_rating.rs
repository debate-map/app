use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general_::extensions::{ToOwnedV};
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, ensure};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::commands::_shared::update_node_rating_summaries::update_node_rating_summaries;
use crate::db::commands::delete_node_rating::{delete_node_rating, DeleteNodeRatingInput};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_ratings::{NodeRating, NodeRatingInput, get_node_ratings};
use crate::db::node_ratings_::_node_rating_type::NodeRatingType;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, command_boilerplate, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_SetNodeRating;
#[Object] impl MutationShard_SetNodeRating {
	async fn set_node_rating(&self, gql_ctx: &async_graphql::Context<'_>, input: SetNodeRatingInput, only_validate: Option<bool>) -> Result<SetNodeRatingResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, set_node_rating);
    }
}

#[derive(InputObject, Deserialize)]
pub struct SetNodeRatingInput {
	pub rating: NodeRatingInput,
}

#[derive(SimpleObject, Debug)]
pub struct SetNodeRatingResult {
	pub id: String,
}

}

pub async fn set_node_rating(ctx: &AccessorContext<'_>, actor: &User, input: SetNodeRatingInput, _extras: NoExtras) -> Result<SetNodeRatingResult, Error> {
	let SetNodeRatingInput { rating: rating_ } = input;
	let mut result = SetNodeRatingResult { id: "<tbd>".o() };
	
	ensure!(rating_.r#type != NodeRatingType::impact, "Cannot set impact rating directly.");

	let old_ratings = get_node_ratings(ctx, &rating_.node, Some(rating_.r#type), Some(&vec![actor.id.to_string()])).await?;
	for old_rating in old_ratings {
		delete_node_rating(ctx, actor, DeleteNodeRatingInput { id: old_rating.id.to_string() }, Default::default()).await?;
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
	};
	result.id = rating.id.to_string();

	set_db_entry_by_id_for_struct(&ctx, "nodeRatings".o(), rating.id.to_string(), rating.clone()).await?;

	update_node_rating_summaries(ctx, actor, rating.node, rating.r#type).await?;

	Ok(result)
}