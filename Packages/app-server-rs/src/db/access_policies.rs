use std::panic;

use rust_shared::anyhow::{Error, anyhow};
use rust_shared::serde_json::json;
use rust_shared::utils::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{async_graphql, SubError, serde, serde_json};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Client};
use rust_shared::tokio_postgres::Row;

use crate::utils::db::accessors::{get_db_entry, get_db_entries, AccessorContext};
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::{QueryFilter, FilterInput}}};

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

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct AccessPolicy {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
    pub name: String,
    pub permissions: serde_json::Value,
    #[graphql(name = "permissions_userExtends")]
    pub permissions_userExtends: serde_json::Value,
}
impl From<Row> for AccessPolicy {
	fn from(row: Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            name: row.get("name"),
            permissions: serde_json::from_value(row.get("permissions")).unwrap(),
            permissions_userExtends: serde_json::from_value(row.get("permissions_userExtends")).unwrap(),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_AccessPolicy { nodes: Vec<AccessPolicy> }
#[Object] impl GQLSet_AccessPolicy { async fn nodes(&self) -> &Vec<AccessPolicy> { &self.nodes } }
impl GQLSet<AccessPolicy> for GQLSet_AccessPolicy {
    fn from(entries: Vec<AccessPolicy>) -> GQLSet_AccessPolicy { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<AccessPolicy> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_AccessPolicy;
#[Subscription]
impl SubscriptionShard_AccessPolicy {
    async fn accessPolicies<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_AccessPolicy, SubError>> + 'a {
        handle_generic_gql_collection_request::<AccessPolicy, GQLSet_AccessPolicy>(ctx, "accessPolicies", filter).await
    }
    async fn accessPolicy<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Option<FilterInput>) -> impl Stream<Item = Result<Option<AccessPolicy>, SubError>> + 'a {
        handle_generic_gql_doc_request::<AccessPolicy>(ctx, "accessPolicies", id).await
    }
}

}