use std::collections::HashSet;

use rust_shared::{
	anyhow::{anyhow, bail, Error},
	db_constants::SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME,
	itertools::Itertools,
	utils::{db::uuid::new_uuid_v4_as_b64_id, time::time_since_epoch_ms_i64},
};

use crate::{
	db::{
		_shared::access_policy_target::AccessPolicyTarget,
		access_policies::get_system_access_policy,
		node_links::ClaimForm,
		node_ratings::{get_node_rating_by_user, get_node_rating_by_user_base, get_node_ratings, get_node_ratings_base, get_rating_average, get_rating_average_base, NodeRating},
		node_ratings_::_node_rating_type::NodeRatingType,
		nodes_::_node::{get_node_form, ArgumentType, Node},
	},
	utils::db::accessors::AccessorContext,
};

// sync:js
pub async fn get_argument_impact_pseudo_rating(ctx: &AccessorContext<'_>, argument: &Node, premises: &[Node], user_id: &str, use_average_for_missing: bool) -> Result<NodeRating, Error> {
	if premises.len() == 0 {
		return Err(anyhow!("No premises provided."));
	}

	let mut premise_probabilities = vec![];
	for premise in premises {
		let rating_value = match get_node_rating_by_user_base(ctx, premise.id.as_str(), NodeRatingType::truth, user_id).await {
			Ok(rating) => rating.value,
			Err(_) => match use_average_for_missing {
				true => get_rating_average_base(ctx, premise.id.as_str(), NodeRatingType::truth, None).await?,
				false => bail!("Premise node #{} has no truth rating by user {}.", premise.id.as_str(), user_id),
			},
		};

		let form = get_node_form(ctx, &premise.id, &argument.id).await?;
		let probability = match form {
			ClaimForm::negation => 1.0 - (rating_value / 100.0),
			_ => rating_value / 100.0,
		};
		premise_probabilities.push(probability);
	}

	let combined_truth_of_premises: f64 = match argument.argumentType {
		Some(ArgumentType::all) => premise_probabilities.iter().fold(1.0, |total, current| total * current),
		Some(ArgumentType::anyTwo) => {
			let strongest = premise_probabilities.iter().fold(0f64, |max, current| max.max(*current));
			let second_strongest = if premise_probabilities.len() > 1 {
				premise_probabilities.iter().fold(0f64, |max, current| if *current != strongest { max.max(*current) } else { max })
			} else {
				0f64
			};
			strongest * second_strongest
		},
		Some(ArgumentType::any) => premise_probabilities.iter().fold(0f64, |max, current| max.max(*current)),
		None => return Err(anyhow!("Argument node's `argumentType` field was set to null!")),
	};

	let relevance: f64 = match get_node_rating_by_user_base(ctx, argument.id.as_str(), NodeRatingType::relevance, user_id).await {
		Ok(rating) => rating.value,
		Err(_) => match use_average_for_missing {
			true => get_rating_average_base(ctx, &argument.id, NodeRatingType::relevance, None).await?,
			false => bail!("Argument node #{} has no relevance rating by user {}.", argument.id.as_str(), user_id),
		},
	};

	// let strengthForType = adjustment.Distance(50) / 50;
	let result: f64 = combined_truth_of_premises * (relevance / 100f64);

	let access_policy = get_system_access_policy(ctx, SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME).await?;
	Ok(NodeRating {
		id: new_uuid_v4_as_b64_id(),
		accessPolicy: access_policy.id.to_string(),
		node: argument.id.to_string(),
		r#type: NodeRatingType::impact,
		creator: user_id.to_owned(),
		createdAt: time_since_epoch_ms_i64(),
		value: float_to_percent(result),
		c_accessPolicyTargets: vec![], // auto-set by db
	})
}

fn float_to_percent(f: f64) -> f64 {
	let result = f * 100.0;
	result.round()
}

/*pub struct RatingFilter {
	pub node_id: String,
	pub rating_type: NodeRatingType,
	pub user_ids: Option<Vec<String>>,
}
pub fn rating_list_after_removes_and_adds(base_list: &[NodeRating], ratings_to_remove: Option<&Vec<String>>, ratings_to_add: Option<&Vec<NodeRating>>, ratings_to_add_filter: &RatingFilter) -> Vec<NodeRating> {
	let mut result = base_list.to_vec();
	if let Some(ratings_to_remove) = ratings_to_remove {
		result.retain(|a| !ratings_to_remove.iter().any(|b| b == a.id.as_str()));
	}
	if let Some(ratings_to_add) = ratings_to_add {
		let ratings_to_add_filtered = ratings_to_add.iter().filter(|a| {
			a.node == ratings_to_add_filter.node_id
			&& a.r#type == ratings_to_add_filter.rating_type
			&& (ratings_to_add_filter.user_ids.is_none() || ratings_to_add_filter.user_ids.unwrap().iter().any(|b| b == &a.creator))
		}).map(|a| a.clone()).collect_vec();
		result.extend(ratings_to_add_filtered);
	}
	result
}*/

// sync:js[loosely]
pub async fn get_argument_impact_pseudo_ratings(ctx: &AccessorContext<'_>, argument: &Node, premises: &Vec<Node>, user_ids: Option<&Vec<String>>, use_average_for_missing: bool) -> Result<Vec<NodeRating>, Error> {
	let mut result = vec![];

	let argument_relevance_ratings = get_node_ratings_base(ctx, &argument.id, Some(NodeRatingType::relevance), user_ids).await?;

	let mut users_who_rated_arg_and_premises = argument_relevance_ratings.iter().map(|a| a.creator.clone()).collect::<HashSet<String>>();
	for premise in premises {
		let premise_truth_ratings = get_node_ratings_base(ctx, &premise.id, Some(NodeRatingType::truth), user_ids).await?;

		let users_who_rated_premise = premise_truth_ratings.iter().map(|a| a.creator.clone()).collect::<HashSet<String>>();
		for user_id in users_who_rated_arg_and_premises.clone() {
			if !users_who_rated_premise.contains(&user_id) {
				users_who_rated_arg_and_premises.remove(&user_id);
			}
		}
	}

	for user_id in &users_who_rated_arg_and_premises {
		if let Ok(impact_rating) = get_argument_impact_pseudo_rating(ctx, &argument, &premises, user_id, use_average_for_missing).await {
			result.push(impact_rating);
		}
	}

	Ok(result)
}
