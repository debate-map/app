use std::collections::HashMap;

use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::itertools::Itertools;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::utils::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general::{average, enum_to_string};
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable, command_boilerplate};
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_update};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_ratings_::_node_rating_type::{rating_value_is_in_range, get_rating_type_info, NodeRatingType};
use crate::db::node_ratings::{NodeRatingInput, get_node_ratings, get_node_ratings_base};
use crate::db::nodes::{get_node, get_node_parents, get_node_children};
use crate::db::nodes_::_node::{RatingSummary, NodeType};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::jsonb_utils::jsonb_set;
use super::rating_processor::get_argument_impact_pseudo_ratings;

pub async fn update_node_rating_summaries(ctx: &AccessorContext<'_>, user_info: &User, node_id: String, rating_type: NodeRatingType) -> Result<(), Error> {
	let ratingTypeInfo = get_rating_type_info(rating_type);
	let ratings = get_node_ratings_base(ctx, &node_id, Some(rating_type), None).await?;
	let ratings_in_each_range = ratingTypeInfo.valueRanges.iter().map(|range|{
		return ratings.iter().filter(|a| rating_value_is_in_range(a.value, range)).cloned().collect_vec();
	}).collect_vec();

	let new_summary = RatingSummary {
		average: if ratings.len() > 0 { Some(average(&ratings.into_iter().map(|a|a.value).collect_vec())) } else { None },
		countsByRange: ratingTypeInfo.valueRanges.iter().enumerate().map(|(i, range)| ratings_in_each_range[i].len() as i64).collect_vec(),
	};

	jsonb_set(&ctx.tx, "nodes", &node_id, "extras", vec!["ratingSummaries".to_owned(), enum_to_string(&rating_type)], Some(serde_json::to_value(new_summary)?)).await?;

	let argument_nodes =
		if rating_type == NodeRatingType::relevance { vec![get_node(ctx, &node_id).await?] }
		else if rating_type == NodeRatingType::truth { get_node_parents(ctx, &node_id).await?.into_iter().filter(|a|a.r#type == NodeType::argument).collect_vec() }
		else { vec![] };
	for argument in argument_nodes {
		let premises = get_node_children(ctx, &argument.id).await?.into_iter().filter(|a|a.r#type == NodeType::claim).collect_vec();
		let ratingTypeInfo_impact = get_rating_type_info(NodeRatingType::impact);
		let ratings_impact = get_argument_impact_pseudo_ratings(ctx, &argument, &premises, None, false).await?;
		let ratings_impact_inEachRange = ratingTypeInfo_impact.valueRanges.iter().map(|range| {
			return ratings_impact.iter().filter(|rating| rating_value_is_in_range(rating.value, range)).cloned().collect_vec();
		}).collect_vec();
		//const average_forUsersRatingAll = ratings_impact.length ? ratings_impact.map(a=>a.value).Average() : null;

		// For the "impact" rating-type, we calculate the "average" a bit differently than normal.
		// Rather than a pure average of the "impact" pseudo-ratings, we use: [average of argument's relevance] * [average of premise-1's truth] * [...]
		// Why? Because the "impact" pseudo-ratings exclude users that only rated one of the above rating-groups; this alternate approach utilizes all the ratings.
		let arg_relevance_ratings = get_node_ratings_base(ctx, argument.id.as_str(), Some(NodeRatingType::relevance), None).await?;
		let premise_truth_rating_sets = {
			let mut sets = vec![];
			for premise in premises {
				sets.push(get_node_ratings_base(ctx, premise.id.as_str(), Some(NodeRatingType::truth), None).await?);
			}
			sets
		};
		let rating_value_sets: Vec<Vec<f64>> = {
			let mut sets = vec![];
			sets.push(arg_relevance_ratings.iter().map(|rating| rating.value).collect_vec());
			for set in premise_truth_rating_sets {
				sets.push(set.iter().map(|rating| rating.value).collect_vec());
			}
			sets
		};
		let rating_value_sets_multiplied = rating_value_sets.iter().fold(1f64, |result, set| {
			if set.len() == 0 { return 0f64; } // if there are no ratings in this set, then we can't calculate an overall score, so have it become 0
			return result * (average(set) / 100f64); // else, there is a valid average for this set, so do the multiplication like normal
		});
		let average_loose = rating_value_sets_multiplied * 100f64;

		let new_impact_summary = RatingSummary {
			average: Some(average_loose),
			countsByRange: ratingTypeInfo_impact.valueRanges.iter().enumerate().map(|(i, range)| ratings_impact_inEachRange[i].len() as i64).collect_vec(),
		};
		
		jsonb_set(&ctx.tx, "nodes", argument.id.as_str(), "extras", vec!["ratingSummaries".to_owned(), "impact".to_owned()], Some(serde_json::to_value(new_impact_summary)?)).await?;
	}

	Ok(())
}