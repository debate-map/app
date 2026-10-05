// debate-map's tables for graphlink_rust (from Scripts/InitDB/Tables/*.sql and RLSPolicies.sql)
// don't list `id` or `extras`: the crate adds/owns them; columns come from `data`, so no DEFAULTs
// user_hiddens / access_policies: the crate hard-codes these names

use graphlink_rust::is_prod;
use graphlink_rust::{co2, co3, initialize_config, AppStateArc, GetServerURL_Options as GL_GetServerURL_Options, MonitorEvent, ServerPod as GL_ServerPod, TableDef, RLS};
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
fn and(a: RLS, b: RLS) -> RLS {
	RLS::And(Box::new(a), Box::new(b))
}

// admin, or creator, or the entry's access policy grants access for `group` (the section of the policy's permissions: maps/nodes/terms/medias/others)
fn admin_or_creator_or_policy(group: &str) -> RLS {
	or(RLS::UserIsAdmin, or(RLS::UserMatchesX("creator".o()), RLS::UserGrantFromPolicy("accessPolicy".o(), group.o())))
}

// admin, or creator, or every policy in the entry's c_accessPolicyTargets grants access (the list is filled from the entry's parents, eg. both nodes of a link)
fn admin_or_creator_or_targets() -> RLS {
	or(RLS::UserIsAdmin, or(RLS::UserMatchesX("creator".o()), RLS::UserGrantFromPolicyTargets("c_accessPolicyTargets".o())))
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

		// gated by the policies of the entry's parents
		// ==========
		table_defs.push(TableDef::new3("nodeLinks", admin_or_creator_or_targets(), vec![
			co2("creator", "text"), co2("createdAt", "bigint"), co2("parent", "text"), co2("child", "text"), co3("form", "text", true), co3("seriesAnchor", "boolean", true), co3("seriesEnd", "boolean", true), co3("polarity", "text", true),
			co2("c_parentType", "text"), co2("c_childType", "text"), co2("group", "text"), co2("orderKey", "text"), co2("c_accessPolicyTargets", "text[]"),
		]));
		table_defs.push(TableDef::new3("nodePhrasings", admin_or_creator_or_targets(), vec![
			co2("creator", "text"), co2("createdAt", "bigint"), co2("node", "text"), co2("type", "text"), co2("text_base", "text"), co3("text_negation", "text", true), co3("text_question", "text", true), co3("text_narrative", "text", true), co3("note", "text", true),
			co2("terms", "jsonb[]"), co2("references", "text[]"), co2("c_accessPolicyTargets", "text[]"),
		]));
		table_defs.push(TableDef::new3("nodeRatings", admin_or_creator_or_targets(), vec![ // has an accessPolicy column, but its sql policy goes by the targets
			co2("accessPolicy", "text"), co2("node", "text"), co2("type", "text"), co2("creator", "text"), co2("createdAt", "bigint"), co2("value", "real"), co2("c_accessPolicyTargets", "text[]"),
		]));
		table_defs.push(TableDef::new3("nodeRevisions", admin_or_creator_or_targets(), vec![
			co2("node", "text"), co2("creator", "text"), co2("createdAt", "bigint"), co2("phrasing", "jsonb"), co3("displayDetails", "jsonb", true), co2("attachments", "jsonb"), co3("replacedBy", "text", true), co2("c_accessPolicyTargets", "text[]"),
		]));
		table_defs.push(TableDef::new3("nodeTags", admin_or_creator_or_targets(), vec![
			co2("creator", "text"), co2("createdAt", "bigint"), co2("nodes", "text[]"), co3("mirrorChildrenFromXToY", "jsonb", true), co3("xIsExtendedByY", "jsonb", true), co3("mutuallyExclusiveGroup", "jsonb", true),
			co3("restrictMirroringOfX", "jsonb", true), co3("labels", "jsonb", true), co3("cloneHistory", "jsonb", true), co2("c_accessPolicyTargets", "text[]"),
		]));
		table_defs.push(TableDef::new3("timelineSteps", admin_or_creator_or_targets(), vec![
			co2("creator", "text"), co2("createdAt", "bigint"), co2("timelineID", "text"), co2("orderKey", "text"), co2("groupID", "text"), co3("timeFromStart", "real", true), co3("timeFromLastStep", "real", true), co3("timeUntilNextStep", "real", true),
			co2("message", "text"), co2("c_accessPolicyTargets", "text[]"),
		]));

		// tables with a rule of their own
		// ==========
		table_defs.push(TableDef::new3("commandRuns", or(RLS::UserIsAdmin, or(RLS::UserMatchesX("actor".o()), and(RLS::FieldIsTrue("public_base".o()), RLS::UserGrantFromPolicyTargets("c_accessPolicyTargets".o())))), vec![ // public_base is set when the actor has addToStream on
			co2("actor", "text"), co2("runTime", "bigint"), co2("public_base", "boolean"), co2("commandName", "text"), co2("commandInput", "jsonb"), co2("commandResult", "jsonb"), co2("c_involvedNodes", "text[]"), co2("c_accessPolicyTargets", "text[]"),
		]));
		table_defs.push(TableDef::new3("mapNodeEdits", or(RLS::UserIsAdmin, RLS::UserGrantFromPolicyTargets("c_accessPolicyTargets".o())), vec![ // no creator column, so admin or targets only
			co2("map", "text"), co2("node", "text"), co2("time", "bigint"), co2("type", "text"), co2("c_accessPolicyTargets", "text[]"),
		]));
		table_defs.push(TableDef::new3("user_hiddens", or(RLS::UserIsAdmin, RLS::UserMatchesX("id".o())), vec![ // each user sees only their own row
			co2("email", "text"), co2("providerData", "jsonb"), co3("backgroundID", "text", true), co3("backgroundCustom_enabled", "boolean", true), co3("backgroundCustom_color", "text", true), co3("backgroundCustom_url", "text", true), co3("backgroundCustom_position", "text", true),
			co2("addToStream", "boolean"), co3("lastAccessPolicy", "text", true), co2("notificationPolicy", "text"), // varchar(1) in the sql file; only `text` columns get the json quotes stripped
		]));
		// admin or own rows; record_command_run.rs lifts rls to notify others
		table_defs.push(TableDef::new3("subscriptions", or(RLS::UserIsAdmin, RLS::UserMatchesX("user".o())), vec![
			co2("user", "text"), co2("node", "text"), co2("addChildNode", "boolean"), co2("deleteNode", "boolean"), co2("addNodeLink", "boolean"), co2("deleteNodeLink", "boolean"), co2("addNodeRevision", "boolean"), co2("setNodeRating", "boolean"),
			co2("createdAt", "bigint"), co2("updatedAt", "bigint"),
		]));
		table_defs.push(TableDef::new3("notifications", or(RLS::UserIsAdmin, RLS::UserMatchesX("user".o())), vec![
			co2("user", "text"), co2("commandRun", "text"), co3("readTime", "bigint", true),
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

/// debate-map's sql functions on top of what pgsync built (all CREATE OR REPLACE, so safe on every boot)
pub async fn run_post_pgsync_sql(app_state: &AppStateArc) -> Result<(), Error> {
	let sql = [
		include_str!("../../../Scripts/InitDB/Funcs/@PreTables.sql"),
		include_str!("../../../Scripts/InitDB/Funcs/General.sql"),
		include_str!("../../../Scripts/InitDB/Funcs/GraphTraversal.sql"),
	].join("\n");
	let mut client = app_state.db_pool.get().await?;
	let tx = client.transaction().await?; // all or nothing; dropping it on error rolls back
	tx.batch_execute(&format!("SET LOCAL search_path TO app;\n{sql}")).await?; // the files expect search_path = app, as InitDB sets it
	tx.commit().await?;
	Ok(())
}
