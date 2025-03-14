use std::process::Command;

use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::domains::is_dev;
use rust_shared::hyper::{Method, Request};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Value};
use rust_shared::{anyhow, async_graphql, serde_json, GQLError};
use rust_shared::{
	anyhow::{bail, ensure},
	axum::{
		self,
		extract::Extension,
		response::{self, IntoResponse},
	},
	itertools::Itertools,
	tower_http,
	utils::{
		_k8s::{exec_command_in_another_pod, get_k8s_pod_basic_infos},
		general::k8s_env,
		general_::extensions::ToOwnedV,
	},
};
use tracing::{info, warn};

use crate::db::general::permission_helpers::is_user_admin;
use crate::db::general::sign_in_::jwt_utils::get_user_info_from_gql_ctx;
use crate::db::map_node_edits::{ChangeType, MapNodeEdit};
use crate::db::node_revisions::{NodeRevision, NodeRevisionInput};
use crate::db::users::User;
use crate::{
	db::general::sign_in_::jwt_utils::resolve_jwt_to_user_info,
	gql::get_gql_data_from_http_request,
	store::storage::AppStateArc,
	utils::{db::accessors::AccessorContext, general::data_anchor::DataAnchorFor1},
};

wrap_slow_macros! {

#[derive(Default)] pub struct QueryShard_General_Backups;
#[Object] impl QueryShard_General_Backups {
	#[graphql(name = "getDBDump")]
	async fn get_db_dump(&self, gql_ctx: &async_graphql::Context<'_>, /*input: GetDBDumpInput*/) -> Result<GetDBDumpResult, GQLError> {
		// query boilerplate (similar to start of output of `command_boilerplate!`, but no such macro exists for queries atm)
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
		let actor = get_user_info_from_gql_ctx(&gql_ctx, &ctx).await?;

		let pgdump_sql = try_get_db_dump(&actor).await?;

		ctx.tx.commit().await?;
		tracing::info!("PG-dump executed, and returned to caller. @actor:{} ({}) @pgdump_sql_len:{}", actor.id.to_string(), actor.displayName, pgdump_sql.len());

		return Ok(GetDBDumpResult {
			pgdump_sql,
		});
	}
}

/*#[derive(InputObject, Serialize, Deserialize)]
pub struct GetDBDumpInput {
}*/

#[derive(SimpleObject, Debug)]
pub struct GetDBDumpResult {
	pub pgdump_sql: String,
}

}

pub async fn try_get_db_dump(actor: &User) -> Result<String, Error> {
	ensure!(is_user_admin(actor), "Only admins can access this endpoint.");

	let target_pod =
		get_k8s_pod_basic_infos("postgres-operator", true).await.context("Failed to retrieve basic-info of the k8s pods.")?.into_iter().find(|a| a.name.starts_with("debate-map-instance1")).map(|a| a.name).ok_or_else(|| anyhow!("Could not find debate-map-instance1-XXX pod."))?;
	let container = "database"; // pod's list of containers: postgres-startup nss-wrapper-init database replication-cert-copy pgbackrest pgbackrest-config

	// raw command string: pg_dump -U postgres debate-map
	let pgdump_output = exec_command_in_another_pod("postgres-operator", &target_pod, Some(container), "pg_dump", vec!["-E".o(), "UTF-8".o(), "-U".o(), "postgres".o(), "debate-map".o()], true).await.context("Failed to run pg_dump command in PG pod.")?;

	// Above, we request utf-8 encoding; however, some chars in prod-cluster's db-dump still fail to parse as utf-8!
	// So, we pass `true` above to allow lossy utf-8 conversion, and then we log a warning if any chars failed to convert.
	// commented; this causes a crash in production for large (700mb+) pg-dumps; not yet sure if this is a code problem, or just it hitting some memory limits a bit earlier than it otherwise would/will
	/*let chars = pgdump_output.chars().collect_vec();
	let failed_conversion_chars = chars.iter().filter(|c| **c == char::REPLACEMENT_CHARACTER).count();
	if failed_conversion_chars > 0 {
		warn!("During retrieval of pg-dump, {} chars failed to convert to utf-8; they were replaced with \"{}\". @pgdump_output_len:{}", failed_conversion_chars, char::REPLACEMENT_CHARACTER, pgdump_output.len());
	}*/

	// TEMPORARY: While working on the feature to add chunking to the transfer of pg-dump data, we want to artifically set the pg-dump data to a very large length in dev-cluster, to surface the issue.
	/*if is_dev() {
		return Ok("a".repeat(600_000_000)); // 600mb is over the NodeJS 500mb string-size limit
	}*/

	Ok(pgdump_output)
}
