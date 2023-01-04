use std::panic;

use rust_shared::anyhow::{Error, anyhow};
use rust_shared::serde_json::json;
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{async_graphql, SubError, serde, serde_json};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Client};
use rust_shared::tokio_postgres::Row;

use crate::utils::db::accessors::{get_db_entry, get_db_entries, AccessorContext};
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::{QueryFilter, FilterInput}}};

use super::commands::_command::FieldUpdate;

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

#[derive(SimpleObject, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct AccessPolicy {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
    pub name: String,
    pub permissions: JSONValue,
    #[graphql(name = "permissions_userExtends")]
    pub permissions_userExtends: JSONValue,
}
impl AccessPolicy {
    // todo: change field-type to struct rather than JSONValue, so this isn't necessary
	pub fn permissions_for_type(&self, policy_field: &str) -> Result<PermissionSetForType, Error> {
        let json_val_for_field = self.permissions.get(policy_field).ok_or(anyhow!("Could not find permissions field:{policy_field}"))?;
		Ok(serde_json::from_value(json_val_for_field.clone())?)
	}
	pub fn permission_extends_for_user_and_type(&self, user_id: Option<String>, policy_field: &str) -> Result<Option<PermissionSetForType>, Error> {
        let user_id = match user_id {
            None => return Ok(None),
            Some(user) => user,
        };
        let json_val_for_user_extends = match self.permissions_userExtends.get(user_id) {
            Some(val) => val,
            None => return Ok(None),
        };
        let json_val_for_field = json_val_for_user_extends.get(policy_field).ok_or(anyhow!("Could not find permissions field:{policy_field}"))?;
		Ok(Some(serde_json::from_value(json_val_for_field.clone())?))
	}
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

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct AccessPolicyInput {
    pub name: String,
    pub permissions: JSONValue,
    #[graphql(name = "permissions_userExtends")]
    pub permissions_userExtends: JSONValue,
}

#[derive(InputObject, Deserialize)]
pub struct AccessPolicyUpdates {
    pub name: FieldUpdate<String>,
    pub permissions: FieldUpdate<JSONValue>,
    #[graphql(name = "permissions_userExtends")]
    pub permissions_userExtends: FieldUpdate<JSONValue>,
}

#[derive(Deserialize)]
pub struct PermissionSet {
	pub terms: PermissionSetForType,
	pub medias: PermissionSetForType,
	pub maps: PermissionSetForType,
	pub nodes: PermissionSetForType,
	// most node-related rows use their node's access-policy as their own; node-ratings is an exception, because individual entries can be kept hidden without disrupting collaboration significantly
	pub nodeRatings: PermissionSetForType,
}
#[derive(Deserialize)]
pub struct PermissionSetForType {
	pub access: bool, // true = anyone, false = no-one
	pub modify: PermitCriteria,
	pub delete: PermitCriteria,

	// for nodes only
	// ==========

	pub vote: PermitCriteria,
	pub addPhrasing: PermitCriteria,
	// commented; users can always add "children" (however, governed maps can set a lens entry that hides unapproved children by default)
	//pub addChild: PermitCriteria,
}
#[derive(Deserialize)]
pub struct PermitCriteria {
	pub minApprovals: i64, // 0 = anyone, -1 = no-one
	pub minApprovalPercent: i64, // 0 = anyone, -1 = no-one
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
    async fn accessPolicy<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<AccessPolicy>, SubError>> + 'a {
        handle_generic_gql_doc_request::<AccessPolicy>(ctx, "accessPolicies", id).await
    }
}

}