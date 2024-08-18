use std::collections::HashMap;
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
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{async_graphql, serde, serde_json, SubError};

use crate::utils::db::accessors::{get_db_entries, get_db_entry, AccessorContext};
use crate::utils::db::agql_ext::gql_utils::IndexMapAGQL;
use crate::utils::db::{
	filter::{FilterInput, QueryFilter},
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};

use super::super::commands::_command::CanOmit;
use super::_permission_set::{APAction, APTable, PermissionSet, PermissionSetForType};

wrap_slow_macros! {

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct AccessPolicy {
	pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub name: String,
	pub permissions: PermissionSet,
	#[graphql(name = "permissions_userExtends")]
	pub permissions_userExtends: IndexMapAGQL<String, PermissionSet>,
}
impl AccessPolicy {
	pub fn permission_extends_for_user_and_table(&self, user_id: Option<&str>, table: APTable) -> Option<PermissionSetForType> {
		let user_id = match user_id {
			None => return None,
			Some(user) => user,
		};
		let permission_set_for_user = match self.permissions_userExtends.get(user_id) {
			Some(val) => val,
			None => return None,
		};
		let permission_set_for_type = permission_set_for_user.for_table(table);
		Some(permission_set_for_type)
	}
}
impl From<Row> for AccessPolicy {
	fn from(row: Row) -> Self {
		Self {
			id: ID::from(&row.get::<&str, String>(&"id".o())), // &"...".o() is temp-fix for rust-analyzer bug
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
	pub permissions: PermissionSet,
	#[graphql(name = "permissions_userExtends")]
	pub permissions_userExtends: IndexMapAGQL<String, PermissionSet>,
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct AccessPolicyUpdates {
	pub name: CanOmit<String>,
	pub permissions: CanOmit<PermissionSet>,
	#[graphql(name = "permissions_userExtends")]
	pub permissions_userExtends: CanOmit<IndexMapAGQL<String, PermissionSet>>,
}

}
