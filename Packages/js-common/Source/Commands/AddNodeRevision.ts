import {Assert, CE} from "web-vcore/nm/js-vextensions.js";
import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, GenerateUUID, SimpleSchema, WrapDBValue} from "web-vcore/nm/mobx-graphlink.js";
import {CommandRunMeta} from "../CommandMacros/CommandRunMeta.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetMapNodeEdits} from "../DB/mapNodeEdits.js";
import {ChangeType, Map_NodeEdit} from "../DB/mapNodeEdits/@MapNodeEdit.js";
import {GetNode} from "../DB/nodes.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";

/** Returned terms are all lowercase. */
export function GetSearchTerms(str: string) {
	return GetSearchTerms_Advanced(str, false).wholeTerms;
}
/** Returned terms are all lowercase. */
export function GetSearchTerms_Advanced(str: string, separateTermsWithWildcard = true) {
	//const terms = str.toLowerCase().replace(/[^a-zA-Z0-9*\-]/g, " ").replace(/ +/g, " ").trim().split(" ").filter(a=>a != ""); // eslint-disable-line
	const terms = str.replace(/ +/g, " ").trim().split(" ").filter(a=>a != ""); // eslint-disable-line
	const wholeTerms = CE(terms.filter(a=>(separateTermsWithWildcard ? !a.includes("*") : true)).map(a=>a.replace(/\*/g, ""))).Distinct().filter(a=>a != "");
	const partialTerms = CE(terms.filter(a=>(separateTermsWithWildcard ? a.includes("*") : false)).map(a=>a.replace(/\*/g, ""))).Distinct().filter(a=>a != "");
	return {wholeTerms, partialTerms};
}

@MapEdit
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
		mapID: {$ref: "UUID"},
		revision: {$ref: MapNodeRevision.name},
	}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddNodeRevision extends Command<{mapID?: string|n, revision: MapNodeRevision}, {id: string}> {
	// controlled by parent
	//lastNodeRevisionID_addAmount = 0;
	recordAsNodeEdit = true;

	node_oldData: MapNode|n;
	nodeEdit?: Map_NodeEdit;
	map_nodeEdits?: Map_NodeEdit[];
	Validate() {
		const {mapID, revision} = this.payload;

		// this.revisionID = (await GetDataAsync('general', 'data', '.lastNodeRevisionID')) + this.lastNodeRevisionID_addAmount + 1;
		revision.id = this.GenerateUUID_Once("revision.id");
		revision.creator = this.userInfo.id;
		revision.createdAt = Date.now();

		/*const titles_joined = CE(revision.titles || {}).VValues().join(" ");
		revision.titles.allTerms = CE(GetSearchTerms(titles_joined)).ToMapObj(a=>a, ()=>true);*/

		if (this.parentCommand == null) {
			this.node_oldData = GetNode.NN(revision.node);
		}

		if (mapID != null && this.recordAsNodeEdit) {
			this.nodeEdit = new Map_NodeEdit({
				id: this.GenerateUUID_Once("nodeEdit.id"),
				map: mapID,
				node: revision.node,
				time: Date.now(),
				type: ChangeType.edit,
			});
			AssertValidate("Map_NodeEdit", this.nodeEdit, "Node-edit entry invalid");

			this.map_nodeEdits = GetMapNodeEdits(mapID);
		}

		this.returnData = {id: revision.id};

		AssertValidate("MapNodeRevision", revision, "Revision invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {mapID, revision} = this.payload;
		// needed, since "node.c_currentRevision" and "nodeRevision.node" are fk-refs to each other
		//db.DeferConstraints = true; // commented; done globally in Command.augmentDBUpdates now (instant-checking doesn't really improve debugging in this context)

		//db.set('general/data/.lastNodeRevisionID', this.revisionID);
		db.set(dbp`nodes/${revision.node}/.c_currentRevision`, revision.id);
		delete revision.phrasing_tsvector; // db populates this automatically
		db.set(dbp`nodeRevisions/${revision.id}`, revision);

		if (mapID != null && this.recordAsNodeEdit) {
			Assert(this.map_nodeEdits && this.nodeEdit);
			// delete prior node-edits entries for this map+node (only need last entry for each)
			// todo: maybe change this to only remove old entries of same map+node+type
			const map_nodeEdits_forSameNode = this.map_nodeEdits.filter(a=>a.node == this.nodeEdit!.node);
			for (const edit of map_nodeEdits_forSameNode) {
				db.set(dbp`mapNodeEdits/${edit.id}`, null);
			}

			// delete old node-edits (ie. older than last 100) for this map, in mapNodeEdits
			const map_nodeEdits_remaining = this.map_nodeEdits.Exclude(...map_nodeEdits_forSameNode);
			const nodeEditsBeforeLast100 = map_nodeEdits_remaining.OrderByDescending(a=>a.time).Skip(100)
				.Take(10); // limit node-edits-to-remove to 10 entries (else server can be overwhelmed and crash; exact diagnosis unknown, but happened for command-runs for case of 227-at-once)
			for (const edit of nodeEditsBeforeLast100) {
				db.set(dbp`mapNodeEdits/${edit.id}`, null);
			}

			//db.set(dbp`maps/${mapID}/nodeEditTimes/data/.${revision.node}`, revision.createdAt);
			//db.set(dbp`mapNodeEditTimes/${mapID}/.${revision.node}`, WrapDBValue(revision.createdAt, {merge: true}));
			db.set(dbp`mapNodeEdits/${this.nodeEdit.id}`, this.nodeEdit);
		}
	}
}