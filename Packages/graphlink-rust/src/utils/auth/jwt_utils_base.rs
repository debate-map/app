use crate::utils::general::type_aliases::JSONValue;
use crate::utils::k8s::k8s::get_or_create_k8s_secret;
use crate::{new_uuid_v4_as_b64, new_uuid_v4_as_b64_id};
use anyhow::{anyhow, Error};
use axum::extract::{Extension, Path};
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{response, Router};
use indoc::indoc;
use jwt_simple::prelude::{Claims, HS256Key, MACLike, VerificationOptions};
use once_cell::sync::OnceCell;
use rust_macros::wrap_slow_macros;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::{HashMap, HashSet};
use std::env;
use std::time::Duration;
use tracing::{error, info, warn};

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

	let jwt_key_base64 = match std::env::var("JWT_SECRET") {
		Ok(val) => {
			//info!("Read secret key from env-var:{:?}", val);
			val
		},
		Err(_) => {
			// create a new key, and try to store it as a k8s secret
			let new_secret_data_if_missing = json!({
				"key": base64::encode(HS256Key::generate().to_bytes()),
			});
			let secret = get_or_create_k8s_secret("lf-jwt-secret-hs256".to_owned(), "default", Some(new_secret_data_if_missing)).await?;
			let secret_key_base64 = secret.data["key"].as_str().ok_or(anyhow!("The \"key\" field is missing!"))?;
			//info!("Read/created secret key through k8s api:{:?}", key_as_base64_str);
			secret_key_base64.to_owned()
		},
	};

	// now that we have the key, store it in global-var for faster retrieval (use get_or_init for safe handling in case this func was called by two threads concurrently)
	let result = JWT_KEY_HS256_STR.get_or_init(|| jwt_key_base64);

	//Ok(jwt_key_base64.to_owned())
	Ok(result.to_owned())
}
