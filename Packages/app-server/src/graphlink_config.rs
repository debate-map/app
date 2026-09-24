// debate-map's tables for graphlink_rust (from Scripts/InitDB/Tables/*.sql and RLSPolicies.sql)
// don't list `id` or `extras`: the crate adds/owns them; columns come from `data`, so no DEFAULTs
// user_hiddens / access_policies: the crate hard-codes these names

use graphlink_rust::is_prod;
use graphlink_rust::{co2, co3, initialize_config, GetServerURL_Options as GL_GetServerURL_Options, MonitorEvent, ServerPod as GL_ServerPod, TableDef, RLS};
use rust_shared::anyhow::Error;
use rust_shared::db_constants::{SYSTEM_USER_EMAIL, SYSTEM_USER_ID};
use rust_shared::domains::{get_server_url, GetServerURL_Options, ServerPod};
use rust_shared::utils::general_::extensions::ToOwnedV;

// graphlink declares its own ServerPod/GetServerURL_Options (same shape as rust_shared's), so bridge them to debate-map's real get_server_url
fn get_server_url_for_graphlink(server_pod: GL_ServerPod, subpath: &str, opts: GL_GetServerURL_Options) -> Result<String, Error> {
	let server_pod = match server_pod {
		GL_ServerPod::WebServer => ServerPod::WebServer,
		GL_ServerPod::AppServer => ServerPod::AppServer,
		GL_ServerPod::Monitor => ServerPod::Monitor,
		GL_ServerPod::Grafana => ServerPod::Grafana,
		GL_ServerPod::Pyroscope => ServerPod::Pyroscope,
	};
	let opts = GetServerURL_Options { claimed_client_url: opts.claimed_client_url, restrict_to_recognized_hosts: opts.restrict_to_recognized_hosts, force_localhost: opts.force_localhost, force_https: opts.force_https };
	get_server_url(server_pod, subpath, opts)
}

// builders for the rules below, so each reads the way its sql does
fn or(a: RLS, b: RLS) -> RLS {
	RLS::Or(Box::new(a), Box::new(b))
}

// admin, or creator, or the entry's access policy grants access for `group` (the section of the policy's permissions: maps/nodes/terms/medias/others)
fn admin_or_creator_or_policy(group: &str) -> RLS {
	or(RLS::UserIsAdmin, or(RLS::UserMatchesX("creator".o()), RLS::UserGrantFromPolicy("accessPolicy".o(), group.o())))
}

pub fn set_up_graphlink_rust(on_monitor_event: fn(MonitorEvent)) {
	let mut table_defs = vec![];
	#[rustfmt::skip]
	{
		// world-readable today (no sql policy); graphlink will still emit a `(SELECT true)` policy, which is harmless
		// ==========
		table_defs.push(TableDef::new3("access_policies", RLS::All, vec![
			co2("name", "text"), co2("creator", "text"), co2("createdAt", "bigint"), co2("permissions", "jsonb"), co2("permissions_userExtends", "jsonb"),
		]));
		table_defs.push(TableDef::new3("users", RLS::All, vec![
			co2("displayName", "text"), co3("photoURL", "text", true), co2("joinDate", "bigint"), co2("permissionGroups", "jsonb"), co2("edits", "integer"), co3("lastEditAt", "bigint", true),
		]));
		table_defs.push(TableDef::new3("globalData", RLS::All, vec![])); // only id + extras, and extras is implicit
		table_defs.push(TableDef::new3("shares", RLS::All, vec![
			co2("creator", "text"), co2("createdAt", "bigint"), co2("name", "text"), co2("type", "text"), co3("mapID", "text", true), co3("mapView", "jsonb", true),
		]));
		table_defs.push(TableDef::new3("feedback_proposals", RLS::All, vec![
			co2("type", "text"), co2("title", "text"), co2("text", "text"), co2("creator", "text"), co2("createdAt", "bigint"), co3("editedAt", "bigint", true), co3("completedAt", "bigint", true),
		])); // "likely to be removed at some point" per rls_policies.rs
		table_defs.push(TableDef::new3("feedback_userInfos", RLS::All, vec![
			co2("proposalsOrder", "text[]"),
		]));

		// gated by the entry's access policy
		// ==========
		table_defs.push(TableDef::new3("maps", admin_or_creator_or_policy("maps"), vec![
			co2("accessPolicy", "text"), co2("name", "text"), co3("note", "text", true), co3("noteInline", "boolean", true), co2("rootNode", "text"), co2("defaultExpandDepth", "integer"), co3("nodeAccessPolicy", "text", true), co3("featured", "boolean", true),
			co2("editors", "text[]"), co2("creator", "text"), co2("createdAt", "bigint"), co2("edits", "integer"), co3("editedAt", "bigint", true),
		]));
		table_defs.push(TableDef::new3("medias", admin_or_creator_or_policy("medias"), vec![
			co2("accessPolicy", "text"), co2("creator", "text"), co2("createdAt", "bigint"), co2("name", "text"), co2("type", "text"), co2("url", "text"), co2("description", "text"),
		]));
		table_defs.push(TableDef::new3("nodes", admin_or_creator_or_policy("nodes"), vec![
			co2("creator", "text"), co2("createdAt", "bigint"), co2("type", "text"), co3("rootNodeForMap", "text", true), co2("c_currentRevision", "text"), co2("accessPolicy", "text"), co3("multiPremiseArgument", "boolean", true), co3("argumentType", "text", true),
		]));
		table_defs.push(TableDef::new3("terms", admin_or_creator_or_policy("terms"), vec![
			co2("creator", "text"), co2("createdAt", "bigint"), co2("accessPolicy", "text"), co2("name", "text"), co2("forms", "text[]"), co3("disambiguation", "text", true), co2("type", "text"), co2("definition", "text"), co3("note", "text", true), co2("attachments", "jsonb"),
		]));
		table_defs.push(TableDef::new3("timelines", admin_or_creator_or_policy("others"), vec![ // policies have no "timelines" section, they fall under "others"
			co2("accessPolicy", "text"), co2("creator", "text"), co2("createdAt", "bigint"), co2("mapID", "text"), co2("name", "text"), co3("videoID", "text", true), co3("videoStartTime", "real", true), co3("videoHeightVSWidthPercent", "real", true),
		]));
	}

	initialize_config(graphlink_rust::Config {
		env_is_prod: is_prod(),
		route_prefix: "".o(), // debate-map's router.rs adds "/app-server" itself when running outside k8s
		table_defs,
		ap_action_defs: vec![],
		on_monitor_event, // the caller decides where the crate's monitor events go (the pgsync example drops them)
		get_server_url: get_server_url_for_graphlink,
		system_user_id: SYSTEM_USER_ID.o(),
		system_user_email: SYSTEM_USER_EMAIL.o(),
	});
}
