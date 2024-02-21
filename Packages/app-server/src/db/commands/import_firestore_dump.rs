use std::collections::HashMap;
use std::fmt::Debug;
use std::fs;

use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::indexmap::IndexMap;
use rust_shared::itertools::Itertools;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::value::Index;
use rust_shared::serde_json::{json, Value};
use rust_shared::db_constants::{SYSTEM_USER_ID, GLOBAL_ROOT_NODE_ID, SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME, SYSTEM_USER_EMAIL, GLOBAL_MAP_ID, SYSTEM_POLICY_PRIVATE_GOVERNED_NAME};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::general_::serde::JSONValueV;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, ensure, bail, Context};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Serialize, Deserialize};
use tracing::{info, warn};

use crate::db::_shared::access_policy_target::AccessPolicyTarget;
use crate::db::_shared::attachments::{TermAttachment, Attachment, EquationAttachment, MediaAttachment, QuoteAttachment, ReferencesAttachment};
use crate::db::_shared::attachments_::source_chain::{source_chain_from_old_json_data, source_chains_from_old_json_data};
use crate::db::_shared::common_errors::err_should_be_populated;
use crate::db::_shared::table_permissions::{does_policy_allow_x, CanVote, CanAddChild};
use crate::db::access_policies::{get_access_policy, get_system_access_policy};
use crate::db::access_policies_::_permission_set::{APAction, APTable};
use crate::db::commands::_command::{command_boilerplate, upsert_db_entry_by_id_for_struct};
use crate::db::general::permission_helpers::{assert_user_can_add_child, is_user_admin};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::maps::Map;
use crate::db::medias::{Media, MediaType};
use crate::db::node_links::{NodeLink, NodeLinkInput, get_node_links, ChildGroup, Polarity, ClaimForm};
use crate::db::node_phrasings::{NodePhrasing, NodePhrasingType, NodePhrasing_Embedded};
use crate::db::node_ratings::NodeRating;
use crate::db::node_ratings_::_node_rating_type::NodeRatingType;
use crate::db::node_revisions::{NodeRevision, ChildOrdering};
use crate::db::node_tags::NodeTag;
use crate::db::nodes::get_node;
use crate::db::nodes_::_node::{Node, ArgumentType};
use crate::db::nodes_::_node_type::{get_node_type_info, NodeType};
use crate::db::shares::{Share, ShareType};
use crate::db::terms::{Term, TermType};
use crate::db::user_hiddens::{UserHidden, get_user_hiddens};
use crate::db::users::{User, PermissionGroups, get_user, get_users};
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::order_key::OrderKey;
use rust_shared::utils::db::uuid::{new_uuid_v4_as_b64, new_uuid_v4_as_b64_id};
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{insert_db_entry_by_id_for_struct, NoExtras, gql_placeholder};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_ImportFirestoreDump;
#[Object] impl MutationShard_ImportFirestoreDump {
	async fn import_firestore_dump(&self, gql_ctx: &async_graphql::Context<'_>, input: ImportFirestoreDumpInput, only_validate: Option<bool>) -> Result<ImportFirestoreDumpResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, import_firestore_dump);
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct ImportFirestoreDumpInput {
	pub placeholder: Option<bool>,
}

#[derive(SimpleObject, Debug)]
pub struct ImportFirestoreDumpResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn import_firestore_dump(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: ImportFirestoreDumpInput, _extras: NoExtras) -> Result<ImportFirestoreDumpResult, Error> {
	let ImportFirestoreDumpInput { placeholder: _placeholder } = input;
	ensure!(is_user_admin(actor), "Must be admin to call this endpoint.");
	// defer database's checking of foreign-key constraints until the end of the transaction (else would error)
    ctx.tx.execute("SET CONSTRAINTS ALL DEFERRED;", &[]).await?;
	// just disable rls for whole command
	ctx.disable_rls().await?;

	let log = |text: &str| {
		info!("ImportFSLog: {text}");
    };
	log("Starting import of firestore dump...");

	let default_policy_id = get_system_access_policy(ctx, SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME).await?.id.to_string();
	let private_policy_id = get_system_access_policy(ctx, SYSTEM_POLICY_PRIVATE_GOVERNED_NAME).await?.id.to_string();

	//let root: JSONValue = serde_json::from_str(include_str!("../../../@Temp_FirestoreImport.json"))?;
	let data_str = fs::read_to_string("@Temp_FirestoreImport.json")?
		.replace("GLOBAL_MAP_00000000001", "GLOBAL_MAP_00000000002")
		.replace("GLOBAL_ROOT_0000000001", "GLOBAL_ROOT_0000000002");
	let root: JSONValue = serde_json::from_str(&data_str)?;
	let collections = root.try_get("__collections__")?.try_get("versions")?.try_get("v12-prod")?.try_get("__collections__")?;
	
	// id-replacements
	// commented; rather than using id-replacements for the two things that need changing (global-map-id and global-root-node-id), just use replace-all in json-str (less error-prone overall)
    /*let mut id_replacements: IndexMap<String, String> = IndexMap::new();
    let mut get_new_id_str = |old_id: &String| {
		if !id_replacements.contains_key(old_id) {
			id_replacements.insert(old_id.to_owned(), new_uuid_v4_as_b64());
		}
		id_replacements.get(old_id).unwrap().to_owned()
	};
	let mut get_final_id_str = |old_id: &String| {
		if old_id == GLOBAL_MAP_ID || old_id == GLOBAL_ROOT_NODE_ID {
			return get_new_id_str(old_id);
		}
		return old_id.o();
	};*/
    //let mut get_new_id = |old_id: &ID| ID(get_new_id_str(&old_id.to_string()));
    //let mut get_new_id = |old_id: &String| ID(get_new_id_str(old_id));

	log("Processing users...");
	// users
	let existing_users = get_users(ctx).await?;
	let existing_user_hiddens = get_user_hiddens(ctx, None).await?;
	let importing_users = {
		let mut subresult: IndexMap<String, User> = IndexMap::new();
		for (old_id, val) in collections.try_get("users")?.try_as_object()? {
			let entry = User {
				id: ID(old_id.o()),
				displayName: val.try_get("displayName")?.try_as_string()?,
				photoURL: val.get("photoURL").map(|a| a.as_string()).unwrap_or(None),
				joinDate: val.try_get("joinDate")?.try_as_i64()?,
				permissionGroups: serde_json::from_value(val.try_get("permissionGroups")?.clone())?,
				edits: val.get("edits").and_then(|a| a.as_i64().map(|b| b as i32)).unwrap_or(0),
				lastEditAt: val.get("lastEditAt").map(|a| a.as_i64()).unwrap_or(None),
			};
			subresult.insert(old_id.o(), entry);
		}
		subresult
	};
	let importing_user_hiddens = {
		let mut subresult: IndexMap<String, UserHidden> = IndexMap::new();
		for (old_id, val) in collections.try_get("users_private")?.try_as_object()? {
			let entry = UserHidden {
				id: ID(old_id.o()),
				email: val.try_get("email")?.try_as_string()?,
				providerData: val.try_get("providerData")?.clone(),
				backgroundID: val.get("backgroundID").map(|a| a.as_string()).unwrap_or(None),
				backgroundCustom_enabled: val.get("backgroundCustom_enabled").map(|a| a.as_bool()).unwrap_or(None),
				backgroundCustom_color: val.get("backgroundCustom_color").map(|a| a.as_string()).unwrap_or(None),
				backgroundCustom_url: val.get("backgroundCustom_url").map(|a| a.as_string()).unwrap_or(None),
				backgroundCustom_position: val.get("backgroundCustom_position").map(|a| a.as_string()).unwrap_or(None),
				addToStream: true,
				lastAccessPolicy: None,
				extras: json!({}),
			};
			subresult.insert(old_id.o(), entry);
		}
		subresult
	};
    let get_existing_user_structs_for_email = |email: &str| -> Option<(User, UserHidden)> {
		let user_hidden = existing_user_hiddens.iter().find(|a| a.email == email);
		match user_hidden {
			None => return None,
			Some(user_hidden) => {
				let user = existing_users.iter().find(|a| a.id == user_hidden.id).unwrap();
				return Some((user.clone(), user_hidden.clone()));
			},
		}
	};
    let final_user_id = |importing_user_id: &String| -> Result<String, Error> {
		//let email = importing_user_hiddens.get(importing_user_id).ok_or(anyhow!("Could not find importing-user-hidden for id:{}", importing_user_id))?.email.as_str();
		let importing_user_hidden = match importing_user_hiddens.get(importing_user_id) {
			// there are some users where the user-hiddens entry is missing, so matching with existing users by email is impossible
			// in these cases, replace the given user with the system-user (it's not ideal, but it's better than having a user-entry with an incorrect email attached)
			//None => return Ok(importing_user_id.to_owned()),
			None => return Ok(SYSTEM_USER_ID.o()),
			Some(a) => a,
		};
		
		let email = importing_user_hidden.email.as_str();
		let existing_user_structs_for_email = get_existing_user_structs_for_email(email);
		match existing_user_structs_for_email {
			None => return Ok(importing_user_id.to_owned()),
			Some((existing_user, _existing_user_hidden)) => {
				return Ok(existing_user.id.to_string());
			},
		}
	};

	// these tables don't have anything worth importing
	//for (key, val) in collections.try_get("general")? {}
	//for (key, val) in collections.try_get("mapNodeEditTimes")? {}
	//for (key, val) in collections.try_get("modules")? {}
	//for (key, val) in collections.try_get("shares")? {} // (eg. "shares" table had only two test entries)
	//for (key, val) in collections.try_get("timelineSteps")? {} // only had one non-test entry (better to just recreate)
	//for (key, val) in collections.try_get("timelines")? {}
	//for (key, val) in collections.try_get("userExtras")? {} // this was already moved away from, but had one entry in it fsr

	log("Importing maps...");
	let mut importing_maps: HashMap<String, Map> = HashMap::new();
	for (old_id, val) in collections.try_get("maps")?.try_as_object()? {
		let entry = Map {
			id: ID(old_id.o()),
			//id: ID(get_final_id_str(map_id)),
			creator: final_user_id(&val.try_get("creator")?.try_as_string()?)?,
			createdAt: val.try_get("createdAt")?.try_as_i64()?,
			//accessPolicy: default_policy_id.o(),
			accessPolicy: private_policy_id.o(), // default maps to private, so I can manually filter out the multitude of "test" maps, prior to making the remainder public
			name: val.try_get("name")?.try_as_string()?,
			note: val.get("note").map(|a| a.as_string()).unwrap_or(None),
			noteInline: val.get("noteInline").map(|a| a.as_bool()).unwrap_or(None),
			rootNode: val.try_get("rootNode")?.try_as_string()?,
			defaultExpandDepth: val.try_get("defaultExpandDepth")?.try_as_i64()? as i32,
			nodeAccessPolicy: Some(default_policy_id.o()),
			featured: Some(false),
			editors: vec![],
			edits: val.get("edits").and_then(|a| a.as_i64().map(|b| b as i32)).unwrap_or(0),
			editedAt: val.get("editedAt").map(|a| a.as_i64()).unwrap_or(None),
			extras: JSONValue::Object(serde_json::Map::new()),
		};
		insert_db_entry_by_id_for_struct(ctx, "maps".o(), entry.id.to_string(), entry.clone()).await?;

		importing_maps.insert(old_id.o(), entry);
	}

	// import nodes early on (right after maps), because maps and nodes are used as targets for "c_accessPolicyTargets" fields, which are set by "BEFORE" triggers (which are *not* delayed -- I think)
	log("Importing nodes...");
	let mut importing_nodes: HashMap<String, Node> = HashMap::new();
	for (old_id, val) in collections.try_get("nodes")?.try_as_object()? {
		let current_rev_id = val.try_get("currentRevision")?.try_as_string()?;
		let current_rev = collections.try_get("nodeRevisions")?.try_as_object()?.into_iter().find(|(key, _val)| **key == current_rev_id).map(|(_key, val)| val.clone()).unwrap();
		//let current_rev = node_revs.iter().find(|a| a.id.as_str() == &current_rev_id).unwrap();

		let mut root_node_for_map = val.get("rootNodeForMap").map(|a| a.as_string()).unwrap_or(None);
		if let Some(root_node_for_map_val) = &root_node_for_map && !importing_maps.contains_key(root_node_for_map_val) {
			warn!("Encountered node whose rootNodeForMap references a map that no longer exists. @node_id:{} @map_id:{}", old_id, root_node_for_map_val);
			root_node_for_map = None;
		}

		let entry = Node {
			id: ID(old_id.o()),
			creator: final_user_id(&val.try_get("creator")?.try_as_string()?)?,
			createdAt: val.try_get("createdAt")?.try_as_i64()?,
			accessPolicy: default_policy_id.o(),
			r#type: match val.try_get("type")?.try_as_i64()? { 10 => NodeType::category, 20 => NodeType::package, 30 => NodeType::multiChoiceQuestion, 40 => NodeType::claim, 50 => NodeType::argument, _ => bail!("Invalid node type") },
			rootNodeForMap: root_node_for_map,
			c_currentRevision: current_rev_id,
			multiPremiseArgument: val.get("multiPremiseArgument").map(|a| a.as_bool()).unwrap_or(None),
			argumentType: match current_rev.get("argumentType").and_then(|a| a.as_i64()) {
				Some(10) => Some(ArgumentType::any),
				Some(15) => Some(ArgumentType::anyTwo),
				Some(20) => Some(ArgumentType::all),
				None => None,
				_ => bail!("Invalid argument type")
			},
			extras: json!({}),
		};
		insert_db_entry_by_id_for_struct(ctx, "nodes".o(), entry.id.to_string(), entry.clone()).await?;

		importing_nodes.insert(old_id.o(), entry);
	}
	
	log("Importing medias...");
	for (old_id, val) in collections.try_get("medias")?.try_as_object()? {
		let entry = Media {
			id: ID(old_id.o()),
			creator: final_user_id(&val.try_get("creator")?.try_as_string()?)?,
			createdAt: val.try_get("createdAt")?.try_as_i64()?,
			accessPolicy: default_policy_id.o(),
			name: val.try_get("name")?.try_as_string()?,
			r#type: match val.try_get("type")?.try_as_i64()? { 10 => MediaType::image, 20 => MediaType::video, _ => bail!("Invalid media type") },
			url: val.try_get("url")?.try_as_string()?,
			description: val.try_get("description")?.try_as_string()?,
		};
		insert_db_entry_by_id_for_struct(ctx, "medias".o(), entry.id.to_string(), entry).await?;
	}
	
	log("Importing nodePhrasings...");
	for (old_id, val) in collections.try_get("nodePhrasings")?.try_as_object()? {
		let entry = NodePhrasing {
			id: ID(old_id.o()),
			creator: final_user_id(&val.try_get("creator")?.try_as_string()?)?,
			createdAt: val.try_get("createdAt")?.try_as_i64()?,
			node: val.try_get("node")?.try_as_string()?,
			r#type: match val.try_get("type")?.try_as_i64()? { 10 => NodePhrasingType::technical, 20 => NodePhrasingType::standard, _ => bail!("Invalid phrasing type") },
			text_base: val.try_get("text")?.try_as_string()?,
			text_negation: None, //val.get("text_negation").map(|a| a.as_string()).unwrap_or(None),
			text_question: None, //val.get("text_question").map(|a| a.as_string()).unwrap_or(None),
			text_narrative: None, //val.get("text_narrative").map(|a| a.as_string()).unwrap_or(None),
			note: val.get("description").map(|a| a.as_string()).unwrap_or(None),
			terms: vec![],
			references: vec![],
			c_accessPolicyTargets: vec![],
		};
		if !importing_nodes.contains_key(&entry.node) {
			warn!("Node-phrasing {} references node {}, which was not found in the import-data. Skipping entry... @entry_data:{}", old_id, entry.node, val.to_string());
			continue;
		};

		insert_db_entry_by_id_for_struct(ctx, "nodePhrasings".o(), entry.id.to_string(), entry).await?;
	}
	
	log("Importing nodeRatings...");
	for (old_id, val) in collections.try_get("nodeRatings")?.try_as_object()? {
		let entry = NodeRating {
			id: ID(old_id.o()),
			creator: final_user_id(&val.try_get("user")?.try_as_string()?)?,
			createdAt: val.try_get("updated")?.try_as_i64()?,
			accessPolicy: default_policy_id.o(),
			node: val.try_get("node")?.try_as_string()?,
			r#type: match val.try_get("type")?.try_as_str()? {
				"significance" => NodeRatingType::significance,
				"neutrality" => NodeRatingType::neutrality,
				"truth" => NodeRatingType::truth,
				"relevance" => NodeRatingType::relevance,
				"impact" => NodeRatingType::impact,
				_ => bail!("Invalid rating type")
			},
			value: val.try_get("value")?.try_as_f64()?,
			c_accessPolicyTargets: vec![],
		};
		if !importing_nodes.contains_key(&entry.node) {
			warn!("Node-rating {} references node {}, which was not found in the import-data. Skipping entry... @entry_data:{}", old_id, entry.node, val.to_string());
			continue;
		};

		insert_db_entry_by_id_for_struct(ctx, "nodeRatings".o(), entry.id.to_string(), entry).await?;
	}

	log("Importing node-tags...");
	for (old_id, val) in collections.try_get("nodeTags")?.try_as_object()? {
		let entry = NodeTag {
			id: ID(old_id.o()),
			creator: final_user_id(&val.try_get("creator")?.try_as_string()?)?,
			createdAt: val.try_get("createdAt")?.try_as_i64()?,
			nodes: serde_json::from_value::<Vec<String>>(val.try_get("nodes")?.clone())?,
			//nodes: serde_json::from_value::<Vec<String>>(val.try_get("nodes")?.clone())?.into_iter().map(|a| final_node_id(a)).collect_vec(),
			labels: None,
			mirrorChildrenFromXToY: val.get("mirrorChildrenFromXToY").map(|a| serde_json::from_value(a.clone()).unwrap()).unwrap_or(None),
			xIsExtendedByY: val.get("xIsExtendedByY").map(|a| serde_json::from_value(a.clone()).unwrap()).unwrap_or(None),
			mutuallyExclusiveGroup: val.get("mutuallyExclusiveGroup").map(|a| serde_json::from_value(a.clone()).unwrap()).unwrap_or(None),
			restrictMirroringOfX: val.get("restrictMirroringOfX").map(|a| serde_json::from_value(a.clone()).unwrap()).unwrap_or(None),
			cloneHistory: None,
			c_accessPolicyTargets: vec![],
		};
		
		// exclude node-tags whose associated nodes are all non-existent
		if entry.nodes.iter().all(|a| !importing_nodes.contains_key(a)) {
			warn!("Encountered node-tag whose associated nodes all no longer exist. @tag_id:{} Skipping...", entry.id.to_string());
			continue;
		}

		insert_db_entry_by_id_for_struct(ctx, "nodeTags".o(), entry.id.to_string(), entry).await?;
	}

	log("Importing node-links...");
	for (old_id, parent_raw_data) in collections.try_get("nodes")?.try_as_object()? {
		let parent = importing_nodes.get(old_id).unwrap();

		let empty_children_map = serde_json::Map::new();
		let children_map = parent_raw_data.get("children").and_then(|a| a.as_object()).unwrap_or(&empty_children_map);
		let mut child_ids_ordered = children_map.keys().cloned().collect_vec();
		let children_order_vec: Option<Vec<String>> = parent_raw_data.get("childrenOrder").and_then(|a| Some(serde_json::from_value(a.clone()).unwrap())).unwrap_or(None);
		if let Some(children_order) = children_order_vec {
			child_ids_ordered.sort_by_cached_key(|id| {
				children_order.iter().position(|a| a == id).unwrap_or(1000)
			});
		}
		let mut child_order_keys: HashMap<String, OrderKey> = HashMap::new();
		for (i, child_id) in child_ids_ordered.iter().enumerate() {
			let order_key = if i == 0 {
				OrderKey::mid()
			} else {
				let last_child_id = child_ids_ordered[i - 1].o();
				let last_order_key = child_order_keys.get(&last_child_id).unwrap();
				last_order_key.next()?
			};
			child_order_keys.insert(child_id.o(), order_key);
		}

		for (child_id, link_info) in children_map {
			let child = importing_nodes.get(child_id).unwrap();
			//let child_raw_data = collections.try_get("nodes")?.try_as_object()?.get(child_id).unwrap();
			let link = NodeLink {
				id: new_uuid_v4_as_b64_id(),
				creator: child.creator.o(),
				createdAt: child.createdAt,
				parent: parent.id.to_string(),
				child: child_id.o(),
				group: match (parent.r#type, child.r#type) {
					(NodeType::claim, NodeType::argument) => ChildGroup::truth,
					(NodeType::argument, NodeType::argument) => ChildGroup::relevance,
					(NodeType::argument, NodeType::claim) => ChildGroup::generic,
					_ => ChildGroup::generic,
				},
				orderKey: child_order_keys.get(child_id).unwrap().clone(),
				form: match link_info.get("form").and_then(|a| a.as_i64()) {
					Some(10) => Some(ClaimForm::base),
					Some(20) => Some(ClaimForm::negation),
					Some(30) => Some(ClaimForm::question),
					None => None,
					_ => bail!("Invalid form")
				},
				seriesAnchor: link_info.get("seriesEnd").map(|a| a.as_bool()).unwrap_or(None),
				seriesEnd: None,
				polarity: match link_info.get("polarity").and_then(|a| a.as_i64()) {
					Some(10) => Some(Polarity::supporting),
					Some(20) => Some(Polarity::opposing),
					None => None,
					_ => bail!("Invalid polarity")
				},
				c_parentType: parent.r#type.clone(),
				c_childType: child.r#type.clone(),
				c_accessPolicyTargets: vec![],
			};
			if !importing_nodes.contains_key(&link.child) {
				warn!("Node-link {} references child-node {}, which was not found in the import-data. Skipping entry... @entry_data:{}", old_id, link.child, link_info.to_string());
				continue;
			};

			insert_db_entry_by_id_for_struct(ctx, "nodeLinks".o(), link.id.to_string(), link).await?;
		}
	}
	
	log("Importing node-revisions...");
	for (old_id, val) in collections.try_get("nodeRevisions")?.try_as_object()? {
		let node_id = val.try_get("node")?.try_as_string()?;
		let node = match importing_nodes.get(&node_id) {
			Some(a) => a,
			None => {
				warn!("Node-revision {} references node {}, which was not found in the import-data. Skipping entry... @entry_data:{}", old_id, node_id, val.to_string());
				continue;
			},
		};
		let node_raw_data = collections.try_get("nodes")?.try_get(&node_id).unwrap();

		//let is_latest_revision = collections.try_get("nodes")?.try_as_object()?.values().any(|a| a.get("currentRevision").and_then(|a| a.as_string()) == Some(old_id.o()));
		let is_latest_revision = node.c_currentRevision == old_id.o();
		if !is_latest_revision { continue; }

		let entry = NodeRevision {
			id: ID(old_id.o()),
			creator: final_user_id(&val.try_get("creator")?.try_as_string()?)?,
			createdAt: val.try_get("createdAt")?.try_as_i64()?,
			node: node_id,
			replacedBy: None,
			phrasing: NodePhrasing_Embedded {
				note: val.get("note").map(|a| a.as_string()).unwrap_or(None),
				terms: val.try_get("termAttachments").unwrap_or(&JSONValue::Array(vec![])).try_as_array()?.into_iter()
					.map(|attachment| TermAttachment { id: attachment.try_get("id").unwrap().try_as_string().unwrap() }).collect_vec(),
				text_base: val.try_get("titles")?.get("base").and_then(|a| a.as_string()).unwrap_or("".o()),
				text_negation: val.try_get("titles")?.get("negation").and_then(|a| a.as_string()),
				text_question: val.try_get("titles")?.get("yesNoQuestion").and_then(|a| a.as_string()),
				text_narrative: None,
			},
			displayDetails: Some(json!({
				"fontSizeOverride": val.get("fontSizeOverride").map(|a| a.as_f64()).unwrap_or(None),
				"widthOverride": val.get("widthOverride").map(|a| a.as_f64()).unwrap_or(None),
				//"childLayout": val.get("").and_then(|a| a.as_).unwrap_or(None),
				"childOrdering": match node_raw_data.get("childrenOrderType").and_then(|a| a.as_i64()) {
					Some(10) => Some(ChildOrdering::manual),
					Some(20) => Some(ChildOrdering::votes),
					None => None,
					_ => bail!("Invalid child ordering")
				},
			})),
			attachments: vec![
				val.get("equation").filter(|a| !a.is_null()).map(|data| {
					let equation = EquationAttachment {
						latex: data.get("latex").map(|a| a.as_bool()).unwrap_or(None).o(),
						text: data.try_get("text").unwrap().try_as_string().unwrap(),
						isStep: data.get("isStep").map(|a| a.as_bool()).unwrap_or(None).o(),
						explanation: data.get("explanation").map(|a| a.as_string()).unwrap_or(None).o(),
					};
					Attachment { expandedByDefault: Some(true), extras: None, equation: Some(serde_json::to_value(equation).unwrap()), media: None, quote: None, references: None, description: None }
				}),
				val.get("media").filter(|a| !a.is_null()).map(|data| {
					let media = MediaAttachment {
						id: data.try_get("id").unwrap().try_as_string().unwrap(),
						captured: data.get("captured").and_then(|a| a.as_bool()).unwrap_or(false),
						previewWidth: data.get("previewWidth").map(|a| a.as_f64()).unwrap_or(None).o(),
						sourceChains: source_chains_from_old_json_data(data.get("sourceChains")).unwrap(),
					};
					Attachment { expandedByDefault: Some(true), extras: None, equation: None, media: Some(serde_json::to_value(media).unwrap()), quote: None, references: None, description: None }
				}),
				val.get("quote").filter(|a| !a.is_null()).map(|data| {
					let quote = QuoteAttachment {
						content: data.try_get("content").unwrap().try_as_string().unwrap(),
						sourceChains: source_chains_from_old_json_data(data.get("sourceChains")).unwrap(),
					};
					Attachment { expandedByDefault: Some(true), extras: None, equation: None, media: None, quote: Some(serde_json::to_value(quote).unwrap()), references: None, description: None }
				}),
				val.get("references").filter(|a| !a.is_null()).map(|data| {
					let references = ReferencesAttachment {
						sourceChains: source_chains_from_old_json_data(data.get("sourceChains")).unwrap(),
					};
					Attachment { expandedByDefault: Some(true), extras: None, equation: None, media: None, quote: None, references: Some(serde_json::to_value(references).unwrap()), description: None }
				}),
			].into_iter().filter_map(|a| a).collect_vec(),
			c_accessPolicyTargets: vec![],
		};
		insert_db_entry_by_id_for_struct(ctx, "nodeRevisions".o(), entry.id.to_string(), entry).await?;
	}

	log("Importing terms...");
	for (old_id, val) in collections.try_get("terms")?.try_as_object()? {
		let entry = Term {
			id: ID(old_id.o()),
			creator: final_user_id(&val.try_get("creator")?.try_as_string()?)?,
			createdAt: val.try_get("createdAt")?.try_as_i64()?,
			accessPolicy: default_policy_id.o(),
			name: val.try_get("name")?.try_as_string()?,
			forms: val.try_get("forms")?.try_as_array()?.into_iter().map(|a| a.try_as_string().unwrap()).collect_vec(),
			disambiguation: val.get("disambiguation").map(|a| a.as_string()).unwrap_or(None),
			r#type: match val.try_get("type")?.try_as_i64()? { 10 => TermType::commonNoun, 20 => TermType::properNoun, 30 => TermType::adjective, 40 => TermType::verb, 50 => TermType::adverb, _ => bail!("Invalid term type") },
			definition: val.try_get("definition")?.try_as_string()?,
			note: val.get("note").map(|a| a.as_string()).unwrap_or(None),
			attachments: vec![],
		};
		insert_db_entry_by_id_for_struct(ctx, "terms".o(), entry.id.to_string(), entry).await?;
	}

	log("Importing users...");
	for (old_id, _importing_user_json) in collections.try_get("users")?.try_as_object()? {
		let importing_user = importing_users.get(old_id).unwrap();
		let importing_user_hidden = match importing_user_hiddens.get(old_id) {
			Some(a) => a,
			None => {
				warn!("Importing-user-hidden data not found for user: {} (references replaced with refs to system-user-id) @edits:{}", old_id, importing_user.edits);
				continue;
			}
		};
		let email = importing_user_hidden.email.as_str();

		let existing_user_structs = get_existing_user_structs_for_email(email);
		match existing_user_structs {
			// a user does not already exist with this email, so import it as a new entry
			None => {
				insert_db_entry_by_id_for_struct(ctx, "users".o(), importing_user.id.to_string(), importing_user).await?;
				insert_db_entry_by_id_for_struct(ctx, "userHiddens".o(), importing_user_hidden.id.to_string(), importing_user_hidden).await?;
			},
			// a user already exists with this email, so merge the importing-data into the existing database entry
			Some((existing_user, _existing_user_hidden)) => {
				let mut merged_user = existing_user.clone();
				merged_user.edits += importing_user.edits;
				merged_user.joinDate = merged_user.joinDate.min(importing_user.joinDate);
				upsert_db_entry_by_id_for_struct(ctx, "users".o(), merged_user.id.to_string(), merged_user).await?;

				/*let new_user_hidden = existing_user_hidden.clone();
				upsert_db_entry_by_id_for_struct(ctx, "userHiddens".o(), new_user_hidden.id.to_string(), new_user_hidden).await?;*/
			},
		}
	}

	log("Done!");
	Ok(ImportFirestoreDumpResult { __: gql_placeholder() })
}