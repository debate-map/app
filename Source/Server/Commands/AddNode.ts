import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ClaimForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
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
		/*if (impactPremiseNode) {
			Assert(node.children == null, `Node cannot specify children. (server adds impact-premise automatically)`);
			Assert(node.childrenOrder == null, `Node cannot specify children-order. (server adds impact-premise automatically)`);
			Assert(impactPremiseNode.parents == null, `Meta-thesis cannot specify a parent. (server adds it automatically)`);
		}*/
		Assert(node.currentRevision == null, "Cannot specifiy node's revision-id. It will be generated automatically.");
		Assert(revision.node == null, "Cannot specifiy revision's node-id. It will be generated automatically.");
	}

	nodeID: number;
	//impactPremiseID: number;
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

		/*this.impactPremiseID = impactPremiseNode ? ++this.lastNodeID_new : null;

		if (impactPremiseNode) {
			impactPremiseNode.createdAt = Date.now();
			node.children = {[this.impactPremiseID]: {_: true}};
			node.childrenOrder = [this.impactPremiseID];
			impactPremiseNode.parents = {[this.nodeID]: {_: true}};
		}*/
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
		//AssertValidate(`MapNode`, impactPremiseNode, `Meta-thesis-node invalid`);
		await this.sub_addRevision.Validate();
	}
	
	GetDBUpdates() {
		let {node} = this.payload;

		let updates = {};
		// add node
		updates["general/lastNodeID"] = this.nodeID;
		updates[`nodes/${this.nodeID}`] = node;

		// add as parent of (pre-existing) children
		//for (let childID in (node.children || {}).Excluding(this.impactPremiseID && this.impactPremiseID.toString())) {
		for (let childID in (node.children || {})) {
			updates[`nodes/${childID}/parents/${this.nodeID}`] = {_: true};
		}

		updates = MergeDBUpdates(updates, this.sub_addRevision.GetDBUpdates());

		/*if (impactPremiseNode) {
			// add impact-premise
			updates[`nodes/${this.impactPremiseID}`] = impactPremiseNode;
			// add impact-premise as parent of (pre-existing) children
			for (let childID in impactPremiseNode.children) {
				updates[`nodes/${childID}/parents/${this.impactPremiseID}`] = {_: true};
			}
		}*/
		
		return updates;
	}
}