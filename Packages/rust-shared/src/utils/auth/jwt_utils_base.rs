use std::collections::{HashMap, HashSet};
use std::env;
use std::time::Duration;

use crate::db_constants::SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME;
use crate::utils::type_aliases::JSONValue;
use crate::{async_graphql, serde_json};
use anyhow::{anyhow, Error};
use axum::extract::{Extension, Path};
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{response, Router};
use graphlink_rust::{get_or_create_k8s_secret, get_uri_params, make_reliable, new_uuid_v4_as_b64, new_uuid_v4_as_b64_id, time_since_epoch_ms_i64, to_anyhow, to_sub_err, to_sub_err_in_stream, SubError};
use indoc::indoc;
use jwt_simple::prelude::{Claims, HS256Key, MACLike, VerificationOptions};
use once_cell::sync::OnceCell;
use rust_macros::wrap_slow_macros;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{error, info, warn};

/// debate-map's k8s secret for the hs256 key (the crate's own default names another project's)
pub const JWT_K8S_SECRET_NAME: &str = "dm-jwt-secret-hs256";

pub async fn get_or_create_jwt_key_hs256() -> Result<HS256Key, Error> {
	graphlink_rust::set_jwt_k8s_secret_name(JWT_K8S_SECRET_NAME); // no-op once set (app-server sets it at startup); here so monitor-backend's tokens use it too
	graphlink_rust::utils::auth::jwt_utils_base::get_or_create_jwt_key_hs256().await
}
