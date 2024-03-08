use std::process::Command;

use rust_shared::{axum::{self, response::{self, IntoResponse}, extract::Extension}, tower_http, utils::{general::k8s_env, _k8s::{exec_command_in_another_pod, get_k8s_pod_basic_infos}, general_::extensions::ToOwnedV}, anyhow::{bail, ensure}, itertools::Itertools};
use rust_shared::hyper::{Request, Method};
use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::anyhow::{anyhow, Error, Context};
use rust_shared::serde::{Serialize, Deserialize};
use tracing::{info, warn};

use crate::db::users::User;
use crate::{utils::{general::data_anchor::DataAnchorFor1, db::accessors::AccessorContext}, gql::get_gql_data_from_http_request, db::general::sign_in_::jwt_utils::resolve_jwt_to_user_info, store::storage::AppStateArc};
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx};
use crate::db::map_node_edits::{ChangeType, MapNodeEdit};
use crate::db::node_revisions::{NodeRevisionInput, NodeRevision};

wrap_slow_macros!{

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
    ensure!(actor.permissionGroups.admin, "Only admins can access this endpoint.");
    
    let target_pod = get_k8s_pod_basic_infos("postgres-operator", true).await?.into_iter().find(|a| a.name.starts_with("debate-map-instance1")).map(|a| a.name).ok_or_else(|| anyhow!("Could not find debate-map-instance1-XXX pod."))?;
    let container = "database"; // pod's list of containers: postgres-startup nss-wrapper-init database replication-cert-copy pgbackrest pgbackrest-config

    // raw command string: pg_dump -U postgres debate-map
    let pgdump_output = exec_command_in_another_pod("postgres-operator", &target_pod, Some(container), "pg_dump", vec![
        "-E".o(), "UTF-8".o(),
        "-U".o(), "postgres".o(),
        "debate-map".o()
    ], true).await?;

    // Above, we request utf-8 encoding; however, some chars in prod-cluster's db-dump still fail to parse as utf-8!
    // So, we pass `true` above to allow lossy utf-8 conversion, and then we log a warning if any chars failed to convert.
    let chars = pgdump_output.chars().collect_vec();
    let failed_conversion_chars = chars.iter().filter(|c| **c == char::REPLACEMENT_CHARACTER).count();
    if failed_conversion_chars > 0 {
        warn!("During retrieval of pg-dump, {} chars failed to convert to utf-8; they were replaced with \"{}\". @pgdump_output_len:{}", failed_conversion_chars, char::REPLACEMENT_CHARACTER, pgdump_output.len());
    }

    Ok(pgdump_output)
}