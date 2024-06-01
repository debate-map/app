use std::{
	collections::{HashMap, HashSet},
	sync::Mutex,
};

use futures_util::StreamExt;
use rust_shared::{
	anyhow::{anyhow, bail, Error},
	db_constants::{SYSTEM_USER_EMAIL, SYSTEM_USER_ID},
	itertools::Itertools,
	once_cell::sync::Lazy,
	serde_json::{self, json},
	to_anyhow, tokio,
	utils::{auth::jwt_utils_base::UserJWTData, general_::extensions::ToOwnedV, time::tokio_sleep},
};
use tracing::error;

use crate::{
	db::{
		access_policies::GQLSet_AccessPolicy,
		access_policies_::_access_policy::AccessPolicy,
		users::{GQLSet_User, User},
	},
	store::storage::AppStateArc,
	utils::db::generic_handlers::subscriptions::handle_generic_gql_collection_subscription_base,
};

pub fn start_db_live_cache(app_state: AppStateArc) {
	let app_state_c1 = app_state.clone();
	// keep the ADMIN_USER_IDS_CACHE up to date
	tokio::spawn(async move {
		loop {
			let system_user_jwt = UserJWTData { id: SYSTEM_USER_ID.o(), email: SYSTEM_USER_EMAIL.o(), readOnly: Some(true) };
			let mut stream = handle_generic_gql_collection_subscription_base::<User, GQLSet_User>(
				app_state_c1.live_queries.clone(),
				Some(system_user_jwt),
				"users".o(),
				Some(json!({
					// todo: once live-query system supports matching on jsonb subfields, use that here
				})),
			)
			.await;
			if let Result::<(), Error>::Err(err) = try {
				loop {
					let next_stream_result = stream.next().await.ok_or(anyhow!("Stream unexpectedly ended."))?;
					let users: Vec<User> = next_stream_result?.nodes;
					// for now, we must filter to admin users here, because live-query system doesn't support matching on jsonb subfields yet
					let admin_users = users.into_iter().filter(|a| a.permissionGroups.admin).collect_vec();

					let admin_user_ids: HashSet<String> = admin_users.into_iter().map(|a| a.id.to_string()).collect();
					let mut cache = ADMIN_USER_IDS_CACHE.lock().map_err(to_anyhow)?;
					*cache = admin_user_ids;
				}
			} {
				error!("Error in db-live-cache updater for ACCESS_POLICIES_CACHE. Restarting live-query in a moment. @err:{:?}", err);
				tokio_sleep(1000).await;
				continue;
			}
		}
	});

	let app_state_c2 = app_state.clone();
	// keep the ACCESS_POLICIES_CACHE up to date
	tokio::spawn(async move {
		loop {
			let system_user_jwt = UserJWTData { id: SYSTEM_USER_ID.o(), email: SYSTEM_USER_EMAIL.o(), readOnly: Some(true) };
			let mut stream = handle_generic_gql_collection_subscription_base::<AccessPolicy, GQLSet_AccessPolicy>(app_state_c2.live_queries.clone(), Some(system_user_jwt), "accessPolicies".o(), None).await;
			if let Result::<(), Error>::Err(err) = try {
				loop {
					let next_stream_result = stream.next().await.ok_or(anyhow!("Stream unexpectedly ended."))?;
					let access_policies: Vec<AccessPolicy> = next_stream_result?.nodes;

					let mut access_policies_map = HashMap::new();
					for policy in access_policies {
						access_policies_map.insert(policy.id.to_string(), policy);
					}

					let mut cache = ACCESS_POLICIES_CACHE.lock().map_err(to_anyhow)?;
					*cache = access_policies_map;
				}
			} {
				error!("Error in db-live-cache updater for ACCESS_POLICIES_CACHE. Restarting live-query in a moment. @err:{:?}", err);
				tokio_sleep(1000).await;
				continue;
			}
		}
	});
}

static ADMIN_USER_IDS_CACHE: Lazy<Mutex<HashSet<String>>> = Lazy::new(|| Mutex::new(HashSet::new()));
pub fn get_admin_user_ids_cached() -> Result<HashSet<String>, Error> {
	let cache = ADMIN_USER_IDS_CACHE.lock().map_err(to_anyhow)?;
	let result: HashSet<String> = cache.iter().cloned().collect();
	if result.len() == 0 {
		bail!("Admin user-ids has not yet been populated in the db-live-cache.");
	}
	Ok(result)
}

static ACCESS_POLICIES_CACHE: Lazy<Mutex<HashMap<String, AccessPolicy>>> = Lazy::new(|| Mutex::new(HashMap::new()));
pub fn get_access_policy_cached(policy_id: &str) -> Result<AccessPolicy, Error> {
	let cache = ACCESS_POLICIES_CACHE.lock().map_err(to_anyhow)?;
	let result = cache.get(policy_id).cloned().ok_or_else(|| anyhow!("Policy \"{}\" not found in cache. @policies_in_cache_count:{}", policy_id, cache.len()))?;
	Ok(result)
}

// todo: maybe add listener on `globalData` table's `dbReadOnly` field, and use it to block new write-transactions (eg. during migrations)
