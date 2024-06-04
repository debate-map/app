use rust_shared::itertools::Itertools;
use rust_shared::utils::general::{as_debug_str, as_json_str, enum_to_string};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json, GQLError};
use rust_shared::anyhow::{anyhow, Error, ensure, bail};
use rust_shared::async_graphql;
use rust_shared::async_graphql::Enum;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::db::node_links::get_node_links;
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_doc_query, handle_generic_gql_collection_query};
use crate::db::nodes::get_node;
use crate::utils::db::accessors::{get_db_entries, AccessorContext};
use crate::utils::db::accessors::get_db_entry;
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{generic_handlers::{subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet}}, filter::FilterInput}};

use super::_shared::access_policy_target::AccessPolicyTarget;
use super::commands::_shared::rating_processor::get_argument_impact_pseudo_ratings;
use super::node_ratings_::_node_rating_type::{NodeRatingType, get_rating_type_info};
use super::nodes::get_node_children;
use super::nodes_::_node::{RatingSummary};
use super::nodes_::_node_type::NodeType;

pub async fn get_node_rating(ctx: &AccessorContext<'_>, id: &str) -> Result<NodeRating, Error> {
    get_db_entry(ctx, "nodeRatings", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

pub async fn get_node_ratings(ctx: &AccessorContext<'_>, node_id: &str, rating_type: Option<NodeRatingType>, user_ids: Option<&Vec<String>>) -> Result<Vec<NodeRating>, Error> {
    if rating_type == Some(NodeRatingType::impact) {
		//Assert(userIDs == null, `Cannot currently use a userIDs filter for getting ratings of type "impact". (query-level optimization not yet added for that case)`);
		let node = get_node(ctx, &node_id).await?;
		let node_children = get_node_children(ctx, node_id).await?;
		let premises = node_children.into_iter().filter(|a| a.r#type == NodeType::claim).collect_vec();
		return Ok(get_argument_impact_pseudo_ratings(ctx, &node, &premises, user_ids, false).await?);
	}
    
    get_node_ratings_base(ctx, node_id, rating_type, user_ids).await
}
// variant needed to avoid need for async-recursion crate (probably temp)
pub async fn get_node_ratings_base(ctx: &AccessorContext<'_>, node_id: &str, rating_type: Option<NodeRatingType>, user_ids: Option<&Vec<String>>) -> Result<Vec<NodeRating>, Error> {
    if rating_type == Some(NodeRatingType::impact) {
		bail!("Cannot call `get_node_ratings_base` with rating-type `impact`; use `get_node_ratings` function instead.");
	}
    
    let mut filter_map = serde_json::Map::new();
    filter_map.insert("node".to_owned(), json!({"equalTo": node_id}));
    if let Some(rating_type) = rating_type {
        filter_map.insert("type".to_owned(), json!({"equalTo": rating_type}));
    }
    if let Some(user_ids) = user_ids {
        filter_map.insert("creator".to_owned(), json!({"in": user_ids}));
    }
    get_db_entries(ctx, "nodeRatings", &Some(JSONValue::Object(filter_map))).await
}

pub async fn get_node_rating_by_user(ctx: &AccessorContext<'_>, node_id: &str, rating_type: NodeRatingType, user_id: &str) -> Result<NodeRating, Error> {
    let matches = get_node_ratings(ctx, node_id, Some(rating_type), Some(&vec![user_id.to_owned()])).await?;
    let result: NodeRating = matches.into_iter().nth(0).ok_or(anyhow!("No rating found for the node+ratingType+userID combo."))?;
	Ok(result)
}
// variant needed to avoid need for async-recursion crate (probably temp)
pub async fn get_node_rating_by_user_base(ctx: &AccessorContext<'_>, node_id: &str, rating_type: NodeRatingType, user_id: &str) -> Result<NodeRating, Error> {
    let matches = get_node_ratings_base(ctx, node_id, Some(rating_type), Some(&vec![user_id.to_owned()])).await?;
    let result: NodeRating = matches.into_iter().nth(0).ok_or(anyhow!("No rating found for the node+ratingType+userID combo."))?;
	Ok(result)
}

pub async fn get_rating_summary(ctx: &AccessorContext<'_>, node_id: &str, rating_type: NodeRatingType) -> Result<RatingSummary, Error> {
    let node = get_node(ctx, node_id).await?;
    let rating_type_info = get_rating_type_info(rating_type);
    Ok(match node.extras_known()?.ratingSummaries.and_then(|a| a.get(&enum_to_string(&rating_type)).cloned()) {
        Some(rating_summary) => rating_summary,
        None => {
            // if rating-summary entry is missing, it must mean no one has rated the node yet, so return a corresponding RatingSummary object
            RatingSummary {
                average: None,
                countsByRange: rating_type_info.valueRanges.iter().map(|_| 0).collect_vec(),
            }
        }
    })
}

pub async fn get_rating_average(ctx: &AccessorContext<'_>, node_id: &str, rating_type: NodeRatingType, user_ids: Option<Vec<String>>) -> Result<f64, Error> {
    //let node = get_node(ctx, &node_id).await?;
    //if node.access_policy.permissions.nodes.vote == false { return Ok(100.0); }

    if let Some(user_ids) = user_ids {
        let ratings = get_node_ratings(ctx, node_id, Some(rating_type), Some(&user_ids)).await?;
        return Ok(ratings_to_average(ratings)?);
    }

    let rating_summary: RatingSummary = get_rating_summary(ctx, node_id, rating_type).await?;
    return Ok(rating_summary.average.unwrap_or(0.0));
}
// variant needed to avoid need for async-recursion crate (probably temp)
pub async fn get_rating_average_base(ctx: &AccessorContext<'_>, node_id: &str, rating_type: NodeRatingType, user_ids: Option<Vec<String>>) -> Result<f64, Error> {
    //let node = get_node(ctx, &node_id).await?;
    //if node.access_policy.permissions.nodes.vote == false { return Ok(100.0); }

    if let Some(user_ids) = user_ids {
        let ratings = get_node_ratings_base(ctx, node_id, Some(rating_type), Some(&user_ids)).await?;
        return Ok(ratings_to_average(ratings)?);
    }

    let rating_summary: RatingSummary = get_rating_summary(ctx, node_id, rating_type).await?;
    return Ok(rating_summary.average.unwrap_or(0.0));
}

fn ratings_to_average(ratings: Vec<NodeRating>) -> Result<f64, Error> {
    if ratings.len() == 0 { return Ok(0.0); }
    let result = ratings.iter().map(|a| a.value).sum::<f64>() / ratings.len() as f64;
    ensure!(result >= 0.0 && result <= 100.0, "Rating-average ({}) not in range. Invalid ratings: {:?}", result, ratings.iter().map(|a| a.value).filter(|a| !a.is_finite()).collect_vec());
    Ok(result)
}

wrap_slow_macros!{

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct NodeRating {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
    pub accessPolicy: String,
    pub node: String,
    pub r#type: NodeRatingType,
	pub value: f64,
    
    #[graphql(name = "c_accessPolicyTargets")]
    pub c_accessPolicyTargets: Vec<AccessPolicyTarget>,
}
impl From<Row> for NodeRating {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct NodeRatingInput {
    pub accessPolicy: String,
    pub node: String,
    pub r#type: NodeRatingType,
	pub value: f64,
}

#[derive(Clone)] pub struct GQLSet_NodeRating { pub nodes: Vec<NodeRating> }
#[Object] impl GQLSet_NodeRating { async fn nodes(&self) -> &Vec<NodeRating> { &self.nodes } }
impl GQLSet<NodeRating> for GQLSet_NodeRating {
    fn from(entries: Vec<NodeRating>) -> GQLSet_NodeRating { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<NodeRating> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_NodeRating;
#[Object] impl QueryShard_NodeRating {
	async fn nodeRatings(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<NodeRating>, GQLError> {
		handle_generic_gql_collection_query(ctx, "nodeRatings", filter).await
	}
	async fn nodeRating(&self, ctx: &Context<'_>, id: String) -> Result<Option<NodeRating>, GQLError> {
		handle_generic_gql_doc_query(ctx, "nodeRatings", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_NodeRating;
#[Subscription] impl SubscriptionShard_NodeRating {
    async fn nodeRatings<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_NodeRating, SubError>> + 'a {
        handle_generic_gql_collection_subscription::<NodeRating, GQLSet_NodeRating>(ctx, "nodeRatings", filter).await
    }
    async fn nodeRating<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<NodeRating>, SubError>> + 'a {
        handle_generic_gql_doc_subscription::<NodeRating>(ctx, "nodeRatings", id).await
    }
}

}