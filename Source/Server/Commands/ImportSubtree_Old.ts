import {AssertV, Command, MergeDBUpdates} from "mobx-firelink";
import {HasAdminPermissions} from "Store/firebase/users/$user";
import {AssertValidate} from "vwebapp-framework";
import {SubtreeExportData_Old} from "UI/@Shared/Maps/MapNode/NodeUI_Menu/MI_ExportSubtree";
import {FromJSON, GetTreeNodesInObjTree, Clone, CE, DEL} from "js-vextensions";
import {MapNode} from "Store/firebase/nodes/@MapNode";
import {MapNodeRevision} from "Store/firebase/nodes/@MapNodeRevision";
import {AsNodeL1} from "Store/firebase/nodes/$node";
import {SourceChain, Source} from "Store/firebase/nodeRevisions/@SourceChain";
import {AddChildNode} from "./AddChildNode";
import {LinkNode_HighLevel} from "./LinkNode_HighLevel";
import {LinkNode} from "./LinkNode";

// for export from old site (see commented code in MI_ExportSubtree.tsx)
export class ImportSubtree_Old extends Command<{mapID?: string, parentNodeID: string, subtreeJSON: string, nodesToLink?: {[key: string]: string}}> {
	rootSubtreeData: SubtreeExportData_Old;

	subs = [] as Command<any, any>[];
	subs_last: Command<any, any>[];
	Validate() {
		AssertV(HasAdminPermissions(this.userInfo.id), "Only admins can run the import-subtree command.");
		AssertValidate({
			properties: {
				mapID: {type: "string"},
				parentNodeID: {type: "string"},
				subtreeJSON: {type: "string"},
				nodesToLink: {patternProperties: {"[0-9]+": {type: "string"}}},
			},
			required: ["subtreeJSON"],
		}, this.payload, "Payload invalid");

		const {subtreeJSON, parentNodeID, nodesToLink} = this.payload;
		this.rootSubtreeData = FromJSON(subtreeJSON);

		// clear each run, since validate gets called more than once
		this.subs_last = this.subs;
		this.subs = [];
		this.oldID_newID = Clone(nodesToLink) ?? {};

		this.ProcessSubtree(this.rootSubtreeData, parentNodeID);
	}

	oldID_newID = {} as {[key: number]: string};
	ProcessSubtree(subtreeData: SubtreeExportData_Old, parentID: string) {
		const {mapID} = this.payload;

		const node = AsNodeL1(WithoutHelpers(subtreeData).Excluding("childrenData" as any, "finalPolarity", "currentRevision", "parents", "children", "childrenOrder"));
		const revision = WithoutHelpers(subtreeData.current).Excluding("node", "approved", "relative") as MapNodeRevision;
		if (revision.image) revision.image.id = `${revision.image.id}`;
		if (revision["contentNode"]) {
			revision.VSet({quote: revision["contentNode"], contentNode: DEL});
			if (revision.quote.sourceChains.length) {
				revision.quote.sourceChains = (revision.quote.sourceChains as any as Source[][]).map(sourceChainSources=>{
					return {sources: sourceChainSources};
				});
			}
		}

		const oldID = subtreeData["_id"];
		if (this.oldID_newID[oldID]) {
			const newID = this.oldID_newID[oldID];
			//const linkNodeCommand = new LinkNode_HighLevel({mapID, parentID, node, revision}).MarkAsSubcommand(this);
			const linkNodeCommand = this.subs_last[this.subs.length] as LinkNode ?? new LinkNode({mapID, parentID, childID: newID, childForm: subtreeData.link.form, childPolarity: subtreeData.link.polarity}).MarkAsSubcommand(this);
			linkNodeCommand.Validate();
			this.subs.push(linkNodeCommand);
		} else {
			const addNodeCommand = this.subs_last[this.subs.length] as AddChildNode ?? new AddChildNode({mapID, parentID, node, revision}).MarkAsSubcommand(this);
			addNodeCommand.Validate();
			this.oldID_newID[oldID] = addNodeCommand.sub_addNode.nodeID;
			this.subs.push(addNodeCommand);

			for (const pair of CE(subtreeData.childrenData).Pairs()) {
				this.ProcessSubtree(pair.value, addNodeCommand.sub_addNode.nodeID);
			}

			if (subtreeData.childrenOrder) {
				//node.childrenOrder = subtreeData.childrenOrder.map(oldID=>{
				addNodeCommand.sub_addNode.payload.node.childrenOrder = subtreeData.childrenOrder.SelectMany(oldChildID=>{
					//AssertV(this.oldID_newID[oldID], `Cannot find newID for oldID: ${oldID}`);
					// data from old site has childrenOrder's with deleted node-ids -- so just leave out the missing ones
					if (this.oldID_newID[oldChildID] == null) return [];
					return [this.oldID_newID[oldChildID]];
				});
			}
		}
	}

	GetDBUpdates() {
		let updates = {};
		for (const sub of this.subs) {
			updates = MergeDBUpdates(updates, sub.GetDBUpdates());
		}
		return updates;
	}
}

const helperProps = ["_key", "_id"];
/** Note: this mutates the original object. */
export function RemoveHelpers(data) {
	var treeNodes = GetTreeNodesInObjTree(data, true);
	for (const treeNode of treeNodes) {
		if (helperProps.Contains(treeNode.prop)) { delete treeNode.obj[treeNode.prop]; }
	}
	return data;
}
export function WithoutHelpers(data) {
	return RemoveHelpers(Clone(data));
}