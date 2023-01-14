use rust_shared::{utils::{auth::jwt_utils_base::UserJWTData, type_aliases::JSONValue}, async_graphql, itertools::Itertools, serde_json};
use serde::Serialize;

use crate::db::{general::sign_in_::jwt_utils::get_user_jwt_data_from_gql_ctx, terms::Term};

use super::rls_policies::UsesRLS;

pub struct RLSApplier {
    pub jwt_data: Option<UserJWTData>,

    //pub last_result_collection: Vec<T>,
    //pub last_result_doc: Vec<T>,
    
    // For the new<>old comparisons, why do we use `serde_json::to_string` rather than `Eq::eq`?
    // Because serialization is actually slightly faster, when you need to store the previous value: https://stackoverflow.com/questions/75003821/speed-of-comparing-structs-using-deriveeq-versus-deriveserialize#comment132359839_75003887
    pub last_result_json: Option<String>,
}
impl RLSApplier {
    pub fn new(jwt_data: Option<UserJWTData>) -> Self {
        Self {
            jwt_data,
            last_result_json: None,
        }
    }
    /*pub async fn new(gql_ctx: &async_graphql::Context<'_>) -> Self {
        let jwt_data = get_user_jwt_data_from_gql_ctx(gql_ctx).await?;
        Self::new(jwt_data)
    }*/

    pub fn filter_next_result_for_collection<T: UsesRLS + Clone + Serialize>(&mut self, next_result: Vec<T>) -> (Vec<T>, bool) {
        let user_id = self.jwt_data.as_ref().map(|a| a.id.as_str());
        let next_result_final = next_result.into_iter().filter(|a| a.can_access_cached(user_id)).collect_vec();
        let next_result_final_json = serde_json::to_string(&next_result_final).unwrap();
        if let Some(last_result_json) = &self.last_result_json && &next_result_final_json == last_result_json {
            return (next_result_final, false);
        }

        self.last_result_json = Some(next_result_final_json);
        (next_result_final, true)
    }
    pub fn filter_next_result_for_doc<T: UsesRLS + Clone + Serialize>(&mut self, next_result: Option<T>) -> (Option<T>, bool) {
        let user_id = self.jwt_data.as_ref().map(|a| a.id.as_str());
        let next_result_final = next_result.filter(|a| a.can_access_cached(user_id));
        let next_result_final_json = serde_json::to_string(&next_result_final).unwrap();
        if let Some(last_result_json) = &self.last_result_json && &next_result_final_json == last_result_json {
            return (next_result_final, false);
        }

        self.last_result_json = Some(next_result_final_json);
        (next_result_final, true)
    }
}