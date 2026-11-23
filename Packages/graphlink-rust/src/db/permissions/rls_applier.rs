use crate::{async_graphql, can_user_access_entry_json, cf, itertools::Itertools, serde_json, to_sub_err, utils::auth::jwt_utils_base::UserJWTData, EntryJSON, IteratorV, RLS};
use anyhow::Error;
use serde::{de::DeserializeOwned, Serialize};

use crate::get_user_jwt_data_from_gql_ctx;

pub struct RLSApplier {
	pub table: String,
	pub rls: RLS,
	pub jwt_data: Option<UserJWTData>,
	//pub last_result_collection: Vec<T>,
	//pub last_result_doc: Vec<T>,

	// For the new<>old comparisons, why do we use `serde_json::to_string` rather than `Eq::eq`?
	// Because we need to also store the previous value, and [use serialize for compare AND store] is faster than [use eq for compare, use clone for storing]: https://stackoverflow.com/questions/75003821/#comment132359839_75003887
	//pub last_jsons_str: Option<String>,
}
impl RLSApplier {
	pub fn new(table: String, jwt_data: Option<UserJWTData>) -> Self {
		let rls = cf().table_def(&table).map(|a| a.rls_policy.clone()).unwrap();
		Self { table, rls, jwt_data /*, last_jsons_str: None*/ }
	}
	/*pub async fn new(gql_ctx: &async_graphql::Context<'_>) -> Self {
		let jwt_data = get_user_jwt_data_from_gql_ctx(gql_ctx).await?;
		Self::new(jwt_data)
	}*/

	/// Returns the next set of filtered entry-structs, if that filtered result-set changed; otherwise, returns None.
	pub fn apply_access_filters<'a>(&mut self, vec_unfiltered: Vec<&'a EntryJSON>) -> Vec<EntryJSON> {
		let user_id = self.jwt_data.as_ref().map(|a| a.id.as_str());
		vec_unfiltered.into_iter().filter(|a| can_user_access_entry_json(a, &self.rls, &self.table, user_id)).cloned().collect_vec()
	}

	//#/ Returns the next set of filtered entry-structs, if that filtered result-set changed; otherwise, returns None.
	/*pub fn filter_next_result_set(&mut self, next_jsons_unfiltered: &Vec<EntryJSON>) -> Option<Vec<EntryJSON>> {
		let user_id = self.jwt_data.as_ref().map(|a| a.id.as_str());
		let next_jsons_filtered = next_jsons_unfiltered.into_iter().filter(|a| can_user_access_entry_json(a, &self.rls, &self.table, user_id)).collect_vec();
		let next_jsons_filtered_str = serde_json::to_string(&next_jsons_filtered).unwrap();
		if let Some(last_jsons_str) = &self.last_jsons_str
			&& &next_jsons_filtered_str == last_jsons_str
		{
			return None;
		}

		self.last_jsons_str = Some(next_jsons_filtered_str);
		Some(next_jsons_filtered.into_iter().cloned().collect_vec())
	}*/
}
