use crate::utils::general::extensions::ToOwnedV;
use crate::utils::general::type_aliases::JSONValue;
use crate::CanOmit;
use crate::IndexMapAGQL;
use crate::{get_db_entries, get_db_entry, AccessorContext};
use crate::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, FilterInput, QueryFilter};
use anyhow::{anyhow, Error};
use async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use futures_util::{stream, Stream, TryFutureExt};
use indexmap::IndexMap;
use rust_macros::wrap_slow_macros;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::panic;
use tokio_postgres::Client;
use tokio_postgres::Row;

//wrap_slow_macros! {

// want this, but doesn't work (async-graphql doesn't support new-types)
/*#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct PermissionSet(pub IndexMap<String, PermissionSetForTable>);*/

//#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
//#[graphql(input_name = "PermissionSetForTypeInput")]
pub type PermissionSet = IndexMapAGQL<String, PermissionSetForTable>;
impl PermissionSet {
	pub fn for_table(&self, table: &str) -> Option<&PermissionSetForTable> {
		self.0.get(table)
	}
	pub fn for_table_perm(&self, table: &str, perm: &str) -> Option<bool> {
		self.0.get(table).and_then(|a| a.perm(perm))
	}
	pub fn for_table_access(&self, table: &str) -> Option<bool> {
		self.0.get(table).and_then(|a| a.access())
	}
}

// want this, but doesn't work (async-graphql doesn't support new-types)
/*#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct PermissionSetForTable(pub IndexMap<String, bool>);*/

/*#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
//#[graphql(input_name = "PermissionSetForTypeInput")]
pub struct PermissionSetForTable {
	pub access: bool, // true = anyone, false = no-one
}*/

pub type PermissionSetForTable = IndexMapAGQL<String, bool>;
impl PermissionSetForTable {
	/*pub fn access(&self) -> bool {
		self.0.get("access").unwrap().clone()
	}*/
	pub fn access(&self) -> Option<bool> {
		self.0.get("access").copied()
	}
	pub fn perm(&self, perm: &str) -> Option<bool> {
		self.0.get(perm).copied()
	}
}

/*pub struct AccessPolicyTarget_Core {
	pub policy_id: String,
	pub ap_table: String,
}
impl AccessPolicyTarget_Core {
	pub fn new(access_policy: String, table: String) -> Self {
		Self { policy_id: access_policy, ap_table: table.o() }
	}
}*/

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
	pub fn permission_extends_for_user_and_table(&self, user_id: Option<&str>, table: &str) -> Option<PermissionSetForTable> {
		let user_id = match user_id {
			None => return None,
			Some(user) => user,
		};
		let permission_set_for_user = match self.permissions_userExtends.get(user_id) {
			None => return None,
			Some(val) => val,
		};
		let permission_set_for_type = permission_set_for_user.for_table(table);
		permission_set_for_type.cloned()
	}
}
/*impl From<Row> for AccessPolicy {
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
}*/

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

//}
