use crate::anyhow::{anyhow, Error};
use crate::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use crate::indexmap::IndexMap;
use crate::rust_macros::wrap_slow_macros;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json::json;
use crate::tokio_postgres::Client;
use crate::tokio_postgres::Row;
use crate::utils::errors::errors::{GQLError, SubError};
use crate::utils::general::type_aliases::JSONValue;
use crate::CanOmit;
use crate::{async_graphql, cf, serde, serde_json};
use crate::{get_db_entries, get_db_entry, AccessorContext};
use crate::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, FilterInput, QueryFilter};
use crate::{AccessPolicy, ListChange, ListChangeCore, ListChangeType};
use futures_util::{stream, Stream, TryFutureExt};
use std::collections::HashMap;
use std::panic;

#[rustfmt::skip]
pub async fn get_access_policy(ctx: &AccessorContext<'_>, id: &str) -> Result<AccessPolicy, Error> {
    get_db_entry(ctx, "access_policies", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_access_policies(ctx: &AccessorContext<'_>, creator_id: Option<String>) -> Result<Vec<AccessPolicy>, Error> {
	let mut filter_map = serde_json::Map::new();
	if let Some(creator_id) = creator_id {
		filter_map.insert("creator".to_owned(), json!({"equalTo": creator_id}));
	}
	get_db_entries(ctx, "access_policies", &Some(JSONValue::Object(filter_map))).await
}

pub async fn get_system_access_policy(ctx: &AccessorContext<'_>, name: &str) -> Result<AccessPolicy, Error> {
	let access_policies_system = get_access_policies(ctx, Some(cf().system_user_id.to_owned())).await?;
	let matching_policy = access_policies_system.into_iter().find(|a| a.name == name).ok_or(anyhow!("Could not find system access-policy with name:{name}"))?;
	//Ok(matching_policy.id.as_str().to_owned())
	Ok(matching_policy)
}

wrap_slow_macros! {

#[derive(Clone)] pub struct ListChange_AccessPolicy { pub core: ListChangeCore<AccessPolicy> }
#[Object] impl ListChange_AccessPolicy {
	async fn changeType(&self) -> &ListChangeType { &self.core.changeType }
	async fn idOfRemoved(&self) -> &Option<String> { &self.core.idOfRemoved }
	async fn data(&self) -> &Vec<AccessPolicy> { &self.core.data }
	async fn hashes(&self) -> &HashMap<String, String> { &self.core.hashes }
}
impl ListChange<AccessPolicy> for ListChange_AccessPolicy {
	fn from(core: ListChangeCore<AccessPolicy>) -> ListChange_AccessPolicy { Self { core } }
}

#[derive(Default)] pub struct QueryShard_AccessPolicy;
#[Object] impl QueryShard_AccessPolicy {
	async fn accessPolicies(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<AccessPolicy>, GQLError> {
		handle_generic_gql_collection_query(ctx, "access_policies", filter).await
	}
	async fn accessPolicy(&self, ctx: &Context<'_>, id: String) -> Result<Option<AccessPolicy>, GQLError> {
		handle_generic_gql_doc_query(ctx, "access_policies", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_AccessPolicy;
#[Subscription] impl SubscriptionShard_AccessPolicy {
	async fn accessPolicies<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>, cached_entry_hashes: Option<HashMap<String, String>>) -> impl Stream<Item = Result<ListChange_AccessPolicy, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<AccessPolicy, ListChange_AccessPolicy>(ctx, "access_policies", filter, cached_entry_hashes, None).await
	}
	async fn accessPolicy<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<AccessPolicy>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<AccessPolicy>(ctx, "access_policies", id).await
	}
}

}
