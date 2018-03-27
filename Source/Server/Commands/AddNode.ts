import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ClaimForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Others";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import { UserEdit, MapEdit } from "Server/CommandMacros";
import {GetSchemaJSON} from "../Server";
import {MapNodeRevision} from "Store/firebase/nodes/@MapNodeRevision";
import AddNodeRevision from "./AddNodeRevision";

export default class AddNode extends Command<{mapID: number, node: MapNode, revision: MapNodeRevision}> {
	lastNodeID_addAmount = 0;
	lastNodeRevisionID_addAmount = 0;
	
	sub_addRevision: AddNodeRevision;
	Validate_Early() {
		let {node, revision} = this.payload;
		Assert(node.currentRevision == null, "Cannot specifiy node's revision-id. It will be generated automatically.");
		Assert(revision.node == null, "Cannot specifiy revision's node-id. It will be generated automatically.");
	}

	nodeID: number;
	parentID: number;
	parent_oldChildrenOrder: number[];
	async Prepare() {
		let {mapID, node, revision} = this.payload;

		this.nodeID = (await GetDataAsync("general", "lastNodeID") as number) + this.lastNodeID_addAmount + 1;
		node.creator = this.userInfo.id;
		node.createdAt = Date.now();

		this.sub_addRevision = new AddNodeRevision({mapID, revision}).MarkAsSubcommand();
		this.sub_addRevision.lastNodeRevisionID_addAmount = this.lastNodeRevisionID_addAmount;
		await this.sub_addRevision.Prepare();

		node.currentRevision = this.sub_addRevision.revisionID;
		revision.node = this.nodeID;
	}
	async Validate() {
		let {node} = this.payload;
		if (this.asSubcommand) {
			let mapNodeSchema = GetSchemaJSON("MapNode");
			// if as subcommand, we might be called by AddChildNode for new argument; in that case, ignore...
			//		the "childrenOrder" prop requirement (gets added by later link-impact-node subcommand)
			delete mapNodeSchema.allOf;
			AssertValidate(mapNodeSchema, node, `Node invalid`);
		} else {
			AssertValidate(`MapNode`, node, `Node invalid`);
		}
		await this.sub_addRevision.Validate();
	}
	
	GetDBUpdates() {
		let {node} = this.payload;

		let updates = {};
		// add node
		updates["general/lastNodeID"] = this.nodeID;
		updates[`nodes/${this.nodeID}`] = node;

		// add as parent of (pre-existing) children
		for (let childID in (node.children || {})) {
			updates[`nodes/${childID}/parents/${this.nodeID}`] = {_: true};
		}

		updates = MergeDBUpdates(updates, this.sub_addRevision.GetDBUpdates());
		
		return updates;
	}
}