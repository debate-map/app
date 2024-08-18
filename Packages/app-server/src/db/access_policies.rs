use std::panic;

use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::indexmap::IndexMap;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::Client;
use rust_shared::tokio_postgres::Row;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{async_graphql, serde, serde_json, GQLError, SubError};

use crate::utils::db::accessors::{get_db_entries, get_db_entry, AccessorContext};
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::{
	filter::{FilterInput, QueryFilter},
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};

use super::access_policies_::_access_policy::AccessPolicy;
use super::commands::_command::CanOmit;

#[rustfmt::skip]
pub async fn get_access_policy(ctx: &AccessorContext<'_>, id: &str) -> Result<AccessPolicy, Error> {
    get_db_entry(ctx, "accessPolicies", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_access_policies(ctx: &AccessorContext<'_>, creator_id: Option<String>) -> Result<Vec<AccessPolicy>, Error> {
	let mut filter_map = serde_json::Map::new();
	if let Some(creator_id) = creator_id {
		filter_map.insert("creator".to_owned(), json!({"equalTo": creator_id}));
	}
	get_db_entries(ctx, "accessPolicies", &Some(JSONValue::Object(filter_map))).await
}

pub async fn get_system_access_policy(ctx: &AccessorContext<'_>, name: &str) -> Result<AccessPolicy, Error> {
	let access_policies_system = get_access_policies(ctx, Some(SYSTEM_USER_ID.to_owned())).await?;
	let matching_policy = access_policies_system.into_iter().find(|a| a.name == name).ok_or(anyhow!("Could not find system access-policy with name:{name}"))?;
	//Ok(matching_policy.id.as_str().to_owned())
	Ok(matching_policy)
}

wrap_slow_macros! {

#[derive(Clone)] pub struct GQLSet_AccessPolicy { pub nodes: Vec<AccessPolicy> }
#[Object] impl GQLSet_AccessPolicy { async fn nodes(&self) -> &Vec<AccessPolicy> { &self.nodes } }
impl GQLSet<AccessPolicy> for GQLSet_AccessPolicy {
	fn from(entries: Vec<AccessPolicy>) -> GQLSet_AccessPolicy { Self { nodes: entries } }
	fn nodes(&self) -> &Vec<AccessPolicy> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_AccessPolicy;
#[Object] impl QueryShard_AccessPolicy {
	async fn accessPolicies(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<AccessPolicy>, GQLError> {
		handle_generic_gql_collection_query(ctx, "accessPolicies", filter).await
	}
	async fn accessPolicy(&self, ctx: &Context<'_>, id: String) -> Result<Option<AccessPolicy>, GQLError> {
		handle_generic_gql_doc_query(ctx, "accessPolicies", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_AccessPolicy;
#[Subscription] impl SubscriptionShard_AccessPolicy {
	async fn accessPolicies<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_AccessPolicy, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<AccessPolicy, GQLSet_AccessPolicy>(ctx, "accessPolicies", filter, None).await
	}
	async fn accessPolicy<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<AccessPolicy>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<AccessPolicy>(ctx, "accessPolicies", id).await
	}
}

}
