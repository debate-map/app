/*/** Returned terms are all lowercase. */
export function GetSearchTerms(str: string) {
	return GetSearchTerms_Advanced(str, false).wholeTerms;
}
/** Returned terms are all lowercase. */
export function GetSearchTerms_Advanced(str: string, separateTermsWithWildcard = true) {
	//const terms = str.toLowerCase().replace(/[^a-zA-Z0-9*\-]/g, " ").replace(/ +/g, " ").trim().split(" ").filter(a=>a != ""); // eslint-disable-line
	const terms = str.replace(/ +/g, " ").trim().split(" ").filter(a=>a != ""); // eslint-disable-line
	const wholeTerms = CE(terms.filter(a=>(separateTermsWithWildcard ? !a.includes("*") : true)).map(a=>a.replace(/\*###/g, ""))).Distinct().filter(a=>a != "");
	const partialTerms = CE(terms.filter(a=>(separateTermsWithWildcard ? a.includes("*") : false)).map(a=>a.replace(/\*###/g, ""))).Distinct().filter(a=>a != "");
	return {wholeTerms, partialTerms};
}*/

/*@MapEdit
@UserEdit
@CommandRunMeta({
	record: true,
	record_cancelIfAncestorCanBeInStream: true,
	canShowInStream: true,
	rlsTargetPaths: [
		{table: "nodes", fieldPath: ["payload", "revision", "node"]},
	],
})
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		mapID: {type: "string"},
		revision: {$ref: NodeRevision.name},
	}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})*/

use rust_shared::anyhow::{anyhow, Error};
use rust_shared::async_graphql::ID;
use rust_shared::time_since_epoch_ms;
use rust_shared::serde::{Serialize, Deserialize};
use uuid::Uuid;
use async_trait::async_trait;

use crate::{db::{node_revisions::NodeRevision, general::accessor_helpers::AccessorContext, nodes::{get_node, Node}}, utils::{type_aliases::JSONValue, db::uuid::new_uuid_v4_as_b64}};

use super::_command::{Command, db_set};

#[derive(Serialize, Deserialize)]
pub struct AddNodeRevisionPayload {
    mapID: Option<String>,
    revision: NodeRevision,
}

#[derive(Serialize, Deserialize)]
pub struct AddNodeRevisionReturnData {
    revisionID: String,
}

pub struct AddNodeRevision {
    payload: AddNodeRevisionPayload,
    return_data: AddNodeRevisionReturnData,
    // generic stuff
    parent_command: Option<Box<dyn Command>>,
    user_info: UserInfo, // for now, just holds id

    // controlled by parent
    // todo: add this back
	//recordAsNodeEdit = true,

	node_old_data: Option<Node>,
    // todo: add this back
	/*nodeEdit: Option<Map_NodeEdit>,
	map_nodeEdits: Option<Vec<Map_NodeEdit>>,*/
}
#[async_trait(?Send)]
impl Command for AddNodeRevision {
	async fn Validate(&self, ctx: &AccessorContext<'_>) -> Result<JSONValue, Error> {
		/*let AddNodeRevisionPayload {mapID, revision} = self.payload;

		revision.id = ID(new_uuid_v4_as_b64());
		revision.creator = self.user_info.id;
		revision.createdAt = time_since_epoch_ms() as i64; // todo: confirm correct

		/*const titles_joined = CE(revision.titles || {}).VValues().join(" ");
		revision.titles.allTerms = CE(GetSearchTerms(titles_joined)).ToMapObj(a=>a, ()=>true);*/

		if self.parent_command.is_none() {
			self.node_old_data = Some(get_node(ctx, revision.node.as_str()).await?);
		}

        // todo: add this back
		/*if mapID.is_some() && self.recordAsNodeEdit {
			self.nodeEdit = Map_NodeEdit {
				id: self.GenerateUUID_Once("nodeEdit.id"),
				map: mapID,
				node: revision.node,
				time: Date.now(),
				type: ChangeType.edit,
			};
			AssertValidate("Map_NodeEdit", self.nodeEdit, "Node-edit entry invalid");

			self.map_nodeEdits = GetNodeEdits(mapID);
		}*/

		self.return_data = AddNodeRevisionReturnData {revisionID: revision.id.0};

        // todo: add this back
		//AssertValidate("NodeRevision", revision, "Revision invalid");*/

        Ok(JSONValue::Null)
	}

	fn Commit(&self, ctx: &AccessorContext<'_>) -> Result<(), Error> {
		/*let AddNodeRevisionPayload {mapID, revision} = self.payload;
		// needed, since "node.c_currentRevision" and "nodeRevision.node" are fk-refs to each other
		//db.DeferConstraints = true; // commented; done globally in Command.augmentDBUpdates now (instant-checking doesn't really improve debugging in this context)

		//db.set('general/data/.lastNodeRevisionID', self.revisionID);
		db_set(ctx, &["nodes", revision.node.as_str(), ".c_currentRevision"], JSONValue::String(revision.id.0));
		//delete revision.phrasing_tsvector; // db populates this automatically
        revision.phrasing_tsvector = "".to_owned(); // db populates this automatically
		db_set(ctx, &["nodeRevisions", revision.id.0.as_str()], revision);

        // todo: add this back
		/*if mapID.is_some() && self.recordAsNodeEdit {
			if !(self.map_nodeEdits && self.nodeEdit) { return Err(anyhow!("Node-edit property not prepared!")); }

			// delete prior node-edits entries for this map+node (only need last entry for each)
			// todo: maybe change this to only remove old entries of same map+node+type
			let map_nodeEdits_forSameNode = self.map_nodeEdits.filter(|a| a.node == self.nodeEdit.node);
			for edit in map_nodeEdits_forSameNode {
				db_set(ctx, &["mapNodeEdits", edit.id.0.as_str()], None);
			}

			// delete old node-edits (ie. older than last 100) for this map, in mapNodeEdits
			let map_nodeEdits_remaining = self.map_nodeEdits.Exclude(...map_nodeEdits_forSameNode);
			let nodeEditsBeforeLast100 = map_nodeEdits_remaining.OrderByDescending(|a| a.time).Skip(100)
				.Take(10); // limit node-edits-to-remove to 10 entries (else server can be overwhelmed and crash; exact diagnosis unknown, but happened for command-runs for case of 227-at-once)
			for edit in nodeEditsBeforeLast100 {
				db_set(ctx, &["mapNodeEdits", edit.id.0.as_str()], None);
			}

			//db_set(ctx, dbp`maps/${mapID}/nodeEditTimes/data/.${revision.node}`, revision.createdAt);
			//db_set(ctx, dbp`mapNodeEditTimes/${mapID}/.${revision.node}`, WrapDBValue(revision.createdAt, {merge: true}));
			db_set(ctx, &["mapNodeEdits", self.nodeEdit.id.0.as_str()], self.nodeEdit);
		}*/*/

        Ok(())
	}
}