use crate::{cf, do_policies_allow_access_cached, does_policy_allow_access_cached, is_user_admin_cached, AccessPolicyTarget, EntryJSON, JSONValue, SQLFragment, SQLIdent, SQLParam, ToOwnedV, User, SF};
use anyhow::{anyhow, Error};
use itertools::{chain, Itertools};
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};

// RLS presets
pub fn RLSPreset_UserIsAdminOrCreator() -> RLS {
	RLS::Or(Box::new(RLS::UserIsAdmin), Box::new(RLS::UserMatchesX("creator".to_string())))
}
/*pub fn RLSPreset_UserIsAdminOrCreatorOrGranted() -> RLS {
	RLS::Or(Box::new(RLS::UserIsAdmin), Box::new(RLS::Or(Box::new(RLS::UserMatchesX("creator".to_string())), Box::new(RLS::UserGrantFromPolicy))))
}*/

#[derive(Debug, Clone)]
pub enum RLS {
	// compositors
	Or(Box<RLS>, Box<RLS>),
	And(Box<RLS>, Box<RLS>),
	// elements
	UserMatchesX(String),
	UserIsAdmin,
	/// First String is the field name that contains the access-policy name, second is the group/table that this object is, and thus should have its data checked within the access-policy.
	UserGrantFromPolicy(String, String),
	/// String is the field holding a list of "access_policy_id:group" targets; every target's policy must grant access. (for rows that inherit access from several parents, eg. a link between two nodes)
	UserGrantFromPolicyTargets(String),
	All,
}
impl RLS {
	pub fn to_sql_fragment(&self) -> Result<SQLFragment, Error> {
		#[rustfmt::skip]
		Ok(SF::merge(vec![
			SF::lit("("),
			match self {
				RLS::Or(a, b) => SF::merge_lines(chain!(
					a.to_sql_fragment()?.once(),
					SF::lit(" OR ").once(),
					b.to_sql_fragment()?.once(),
				).collect_vec()),
				RLS::And(a, b) => SF::merge_lines(chain!(
					a.to_sql_fragment()?.once(),
					SF::lit(" AND ").once(),
					b.to_sql_fragment()?.once(),
				).collect_vec()),
				RLS::UserMatchesX(field) => SF::new("$I = current_setting('app.current_user_id')", vec![SQLIdent::new_boxed(field.o())?]),
				// we add (SELECT X) for each function called; this is needed to create a caching-point for the result of that call (see: https://stackoverflow.com/a/75105382)
				RLS::UserIsAdmin => SF::lit("SELECT is_user_admin('@me')"),
				RLS::UserGrantFromPolicy(field_name, group) => SF::new("SELECT does_policy_allow_access('@me', $I, $I)", vec![SQLIdent::new_boxed(field_name.o())?, Box::new(SQLIdent::new(group.o())?.set_use_single_quotes(true))]),
				RLS::UserGrantFromPolicyTargets(field_name) => SF::new("SELECT do_policies_allow_access('@me', $I)", vec![SQLIdent::new_boxed(field_name.o())?]),
				RLS::All => SF::lit("SELECT true"),
			},
			SF::lit(")"),
		]))
	}
}

pub fn can_user_access_entry_json(entry: &EntryJSON, rls: &RLS, table_name: &str, user_id: Option<&str>) -> bool {
	match rls {
		RLS::Or(a, b) => can_user_access_entry_json(entry, a, table_name, user_id) || can_user_access_entry_json(entry, b, table_name, user_id),
		RLS::And(a, b) => can_user_access_entry_json(entry, a, table_name, user_id) && can_user_access_entry_json(entry, b, table_name, user_id),
		RLS::UserMatchesX(field) => entry.get(field).and_then(|a| a.as_str()) == user_id,
		RLS::UserIsAdmin => is_user_admin_cached(user_id),
		RLS::UserGrantFromPolicy(field_name, rls_group) => {
			let policy_id = entry.get(field_name).and_then(|a| a.as_str()).expect(&format!("Expected field {} in entry-json to exist, and be a string", field_name));
			assert!(table_name == rls_group, "Table-name from call to `can_user_access_entry_json` should be the same as the one in the entry-json");
			does_policy_allow_access_cached(user_id, policy_id, table_name)
		},
		RLS::UserGrantFromPolicyTargets(field_name) => {
			let targets: Vec<AccessPolicyTarget> = entry.get(field_name).cloned().and_then(|a| serde_json::from_value(a).ok()).unwrap_or_default(); // a missing or unparsable list counts as empty, which the checker denies
			do_policies_allow_access_cached(user_id, &targets)
		},
		RLS::All => true,
	}
}

/// Calling this has non-negligible overhead, if called in large loops. (since it calls serde_json::to_value on the struct)
pub fn can_user_access_entry_struct<T: Serialize>(entry_struct: &T, table_name: &str, user_id: Option<&str>) -> bool {
	let result: Result<bool, Error> = try {
		let entry_json = EntryJSON::from_struct(entry_struct)?;
		let rls = &cf().table_def(table_name)?.rls_policy;
		can_user_access_entry_json(&entry_json, &rls, table_name, user_id)
	};
	result.unwrap_or(false)
}

/// Calling this has non-negligible overhead, if called in large loops. (since it calls serde_json::to_value on the struct)
/// (this is an overload of can_user_access_entry_struct(), with slightly more ergonomic usage from within graphql command functions)
pub fn can_actor_access_entry_struct<T: Serialize>(entry_struct: &T, table_name: &str, actor: &User) -> bool {
	let user_id = Some(actor.id.as_str());
	can_user_access_entry_struct(entry_struct, table_name, user_id)
}

/*pub fn rls_policy_to_sql(rls: RLS) -> String {
	match rls {
		RLS::Or(a, b) => format!("({}) OR ({})", rls_policy_to_sql(*a), rls_policy_to_sql(*b)),
		RLS::And(a, b) => format!("({}) AND ({})", rls_policy_to_sql(*a), rls_policy_to_sql(*b)),
		RLS::UserMatchesX(field) => format!("{} = current_setting('app.current_user_id')", field),
		RLS::UserIsAdmin => "current_setting('app.current_user_is_admin') = 'true'".to_string(),
		RLS::UserGrantFromPolicy => "EXISTS (SELECT 1 FROM app.access_policies WHERE id = current_setting('app.current_user_id') AND table_name = current_setting('app.current_table_name'))".to_string(),
		RLS::All => "true".to_string(),
	}
}*/
