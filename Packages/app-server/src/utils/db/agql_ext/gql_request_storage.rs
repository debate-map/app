use std::sync::{Arc};

use rust_shared::{utils::auth::jwt_utils_base::UserJWTData, tokio::sync::{RwLock}};

/// This struct "stores data local to the current graphql request", with a primary usage being for sharing data among graphql calls, within the same "long-running websocket request".
/// For example, a websocket request may have two graphql calls: The 1st one verifies and stores a user-provided JWT with auth data; the 2nd one then does some mutation, using that auth data.
pub struct GQLRequestStorage {
    pub jwt: Arc<RwLock<Option<UserJWTData>>>,
}
impl GQLRequestStorage {
    pub fn new() -> Self {
        Self {
            jwt: Arc::new(RwLock::new(None)),
        }
    }
}