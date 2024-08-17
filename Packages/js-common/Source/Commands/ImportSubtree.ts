/*import {AssertV, Command, MergeDBUpdates, GenerateUUID, NoID} from "mobx-graphlink";
import {AssertValidate, Validate} from "mobx-graphlink";
import {FromJSON, GetTreeNodesInObjTree, Clone, CE, DEL} from "js-vextensions";
import {AddChildNode} from "./AddChildNode.js";
import {LinkNode_HighLevel} from "./LinkNode_HighLevel.js";
import {LinkNode} from "./LinkNode.js";
import {SetNodeRating} from "./SetNodeRating.js";
import {HasAdminPermissions} from "../DB/users/$user.js";
import {AsNodeL1} from "../DB/nodes/$node.js";
import {NodeRevision} from "../DB/nodes/@NodeRevision.js";
import {Source} from "../DB/nodeRevisions/@SourceChain.js";
import {NodeRatingType} from "../DB/nodeRatings/@NodeRatingType.js";
import {NodeRating} from "../DB/nodeRatings/@NodeRating.js";
import {WithoutHelpers} from "./ImportSubtree_Old.js";

// todo: replace with new structure, when actually used again
type SubtreeExportData_Old = any;

// for export from old site (see commented code in MI_ExportSubtree.tsx)
export class ImportSubtree extends Command<{
	mapID?: string, parentNodeID: string, subtreeJSON: string,
	nodesToLink?: {[key: string]: string},
	importRatings: boolean, importRatings_userIDs?: string[],
}> {
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
				importRatings: {type: "boolean"},
				importRatings_userIDs: {items: {type: "string"}},
			},
			required: ["subtreeJSON"],
		}, this.payload, "Payload invalid");

		const {subtreeJSON, parentNodeID, nodesToLink} = this.payload;
		this.rootSubtreeData = FromJSON(subtreeJSON);

		// clear each run, since validate gets called more than once
		this.subs_last = this.subs;
		this.subs = [];
		this.oldID_newID = Clone(nodesToLink) ?? {};
		this.nodeRatingsToAdd = [];

		this.ProcessSubtree(this.rootSubtreeData, parentNodeID);
	}

	oldID_newID = {} as {[key: number]: string};
	ProcessSubtree(subtreeData: SubtreeExportData_Old, parentID: string) {
		const {mapID, importRatings, importRatings_userIDs} = this.payload;

		const node = AsNodeL1(WithoutHelpers(subtreeData).ExcludeKeys("ratings", "childrenData", "finalPolarity", "currentRevision", "parents", "children", "childrenOrder"));
		const revision = WithoutHelpers(subtreeData.current).ExcludeKeys("node", "approved", "relative", "voteLevel") as NodeRevision;
		if (revision.media) revision.media.id = `${revision.media.id}`;
		if (revision["contentNode"]) {
			CE(revision).VSet({quote: revision["contentNode"], contentNode: DEL});
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
			const linkNodeCommand = (this.subs_last[this.subs.length] as LinkNode) ?? new LinkNode({mapID, parentID, childID: newID, childForm: subtreeData.link.form, childPolarity: subtreeData.link.polarity}).MarkAsSubcommand(this);
			linkNodeCommand.Validate();
			this.subs.push(linkNodeCommand);
		} else {
			const addNodeCommand = (this.subs_last[this.subs.length] as AddChildNode) ?? new AddChildNode({mapID, parentID, node, revision, link: WithoutHelpers(subtreeData.link)}).MarkAsSubcommand(this);
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

		if (importRatings && subtreeData.ratings) {
			for (let {key: ratingType, value: ratingsByUser} of subtreeData.ratings.Pairs()) {
				if (Validate("NodeRatingType", ratingType) != null) continue;
				for (let {key: userID, value: rating} of ratingsByUser.Pairs()) {
					if (Validate("UserID", userID) != null) continue;
					if (importRatings_userIDs != null && !importRatings_userIDs.includes(userID)) continue;
					let newNodeID = this.oldID_newID[oldID];
					//let addRatingCommand = new SetNodeRating({nodeID: newNodeID, ratingType: ratingType as RatingType, value: rating.value, userID}).MarkAsSubcommand(this);
					this.nodeRatingsToAdd.push({node: newNodeID, type: ratingType as NodeRatingType, user: userID, editedAt: rating.updated, value: rating.value});
				}
			}
		}
	}
	nodeRatingsToAdd = [] as NoID<NodeRating>[];

	DeclareDBUpdates(db: DBHelper) {
		for (const sub of this.subs) {
			db.add(sub.GetDBUpdates(db));
		}
		for (let rating of this.nodeRatingsToAdd) {
			db.set(dbp`nodeRatings/${GenerateUUID()}`, rating);
		}
	}
}*/