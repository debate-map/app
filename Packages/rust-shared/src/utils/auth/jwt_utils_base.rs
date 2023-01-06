use std::collections::{HashMap, HashSet};
use std::env;
use std::time::Duration;

use anyhow::{anyhow, Error};
use axum::response::IntoResponse;
use axum::{Router, response};
use axum::extract::{Extension, Path};
use axum::routing::get;
use once_cell::sync::OnceCell;
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use crate::utils::db::uuid::{new_uuid_v4_as_b64, new_uuid_v4_as_b64_id};
use crate::db_constants::SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME;
use crate::utils::futures::make_reliable;
use crate::utils::general::get_uri_params;
use indoc::indoc;
use crate::utils::time::time_since_epoch_ms_i64;
use crate::utils::type_aliases::JSONValue;
use crate::utils::_k8s::{get_or_create_k8s_secret};
use crate::{async_graphql, serde_json, SubError, to_sub_err, to_sub_err_in_stream, to_anyhow};
use tracing::{info, error, warn};
use jwt_simple::prelude::{HS256Key, Claims, MACLike, VerificationOptions};

/// Rather than baking the permissions and such into the jwt, we store only the id and email, which are unchanging fields. (well that and the `readOnly` flag, letting the user restrict the JWT's capabilities)
/// We later use that minimal info to retrieve the full user-data from the database. (this way it's up-to-date if the user's username, permissions, etc. change)
#[derive(Clone, Serialize, Deserialize)]
pub struct UserJWTData {
    pub id: String,
    pub email: String,
    pub readOnly: Option<bool>,
}

pub async fn get_or_create_jwt_key_hs256() -> Result<HS256Key, Error> {
    let key_str = get_or_create_jwt_key_hs256_str().await?;
    let key_str_bytes = base64::decode(key_str)?;
    let key = HS256Key::from_bytes(&key_str_bytes);
    Ok(key)
}
static JWT_KEY_HS256_STR: OnceCell<String> = OnceCell::new();
/// Retrieves and/or creates the hs256 secret-key for use in generating JWTs.
/// Why do retrieval manually rather than having k8s import it as an environment-variable at startup?
/// Because k8s converts the base64 string into a utf8 string, which makes conversion complicated. (we want to decode it simply as a raw byte-array, for passing to HS256Key::from_bytes)
pub async fn get_or_create_jwt_key_hs256_str() -> Result<String, Error> {
    // first, try to read the key from a global variable (in case this func has already been run)
    if let Some(key_as_base64_str) = JWT_KEY_HS256_STR.get() {
        //info!("Retrieved secret key from global-var:{:?}", key_as_base64_str);
        return Ok(key_as_base64_str.to_owned());
    }
    
    // create a new key, and try to store it as a k8s secret
    let new_secret_data_if_missing = json!({
        "key": base64::encode(HS256Key::generate().to_bytes()),
    });
    let secret = get_or_create_k8s_secret("dm-jwt-secret-hs256".to_owned(), new_secret_data_if_missing).await?;
    let key_as_base64_str = secret.data["key"].as_str().ok_or(anyhow!("The \"key\" field is missing!"))?;
    //info!("Read/created secret key through k8s api:{:?}", key_as_base64_str);

    // now that we have the key, store it in global-var for faster retrieval (use get_or_init for safe handling in case this func was called by two threads concurrently)
    let result = JWT_KEY_HS256_STR.get_or_init(|| key_as_base64_str.to_owned());
    
    //Ok(key_as_base64_str.to_owned())
    Ok(result.to_owned())
}