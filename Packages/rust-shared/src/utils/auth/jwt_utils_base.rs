use std::collections::{HashMap, HashSet};
use std::env;
use std::time::Duration;

use crate::db_constants::SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME;
use crate::utils::_k8s::get_or_create_k8s_secret;
use crate::utils::db::uuid::{new_uuid_v4_as_b64, new_uuid_v4_as_b64_id};
use crate::utils::futures::make_reliable;
use crate::utils::general::get_uri_params;
use crate::utils::time::time_since_epoch_ms_i64;
use crate::utils::type_aliases::JSONValue;
use crate::{async_graphql, serde_json, to_anyhow, to_sub_err, to_sub_err_in_stream, SubError};
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
use tracing::{error, info, warn};

// the crate's token payload and key lookup, so tokens made here and checked by the crate share one key (JWT_SECRET if set, else the k8s secret below)
pub use graphlink_rust::utils::auth::jwt_utils_base::UserJWTData;

/// debate-map's k8s secret for the hs256 key (the crate's own default names another project's)
pub const JWT_K8S_SECRET_NAME: &str = "dm-jwt-secret-hs256";

pub async fn get_or_create_jwt_key_hs256() -> Result<HS256Key, Error> {
	graphlink_rust::set_jwt_k8s_secret_name(JWT_K8S_SECRET_NAME); // no-op once set (app-server sets it at startup); here so monitor-backend's tokens use it too
	graphlink_rust::utils::auth::jwt_utils_base::get_or_create_jwt_key_hs256().await
}
