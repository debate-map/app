import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import { UserEdit, MapEdit } from "Server/CommandMacros";

export default class AddNode extends Command<{node: MapNode}> {
	asSubcommand = false; // must be set to true, by a parent command, for this command to validate
	Validate_Early() {
		let {node} = this.payload;
		/*if (impactPremiseNode) {
			Assert(node.children == null, `Node cannot specify children. (server adds impact-premise automatically)`);
			Assert(node.childrenOrder == null, `Node cannot specify children-order. (server adds impact-premise automatically)`);
			Assert(impactPremiseNode.parents == null, `Meta-thesis cannot specify a parent. (server adds it automatically)`);
		}*/
	}

	lastNodeID_new: number;
	nodeID: number;
	//impactPremiseID: number;
	parentID: number;
	parent_oldChildrenOrder: number[];
	async Prepare() {
		let {node} = this.payload;

		this.lastNodeID_new = await GetDataAsync("general", "lastNodeID") as number;
		this.nodeID = ++this.lastNodeID_new;
		node.creator = this.userInfo.id;
		node.createdAt = Date.now();
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
		AssertValidate(`MapNode`, node, `Node invalid`);
		//AssertValidate(`MapNode`, impactPremiseNode, `Meta-thesis-node invalid`);
	}
	
	GetDBUpdates() {
		let {node} = this.payload;

		let updates = {};
		// add node
		updates["general/lastNodeID"] = this.lastNodeID_new;
		updates[`nodes/${this.nodeID}`] = node;

		// add as parent of (pre-existing) children
		//for (let childID in (node.children || {}).Excluding(this.impactPremiseID && this.impactPremiseID.toString())) {
		for (let childID in (node.children || {})) {
			updates[`nodes/${childID}/parents/${this.nodeID}`] = {_: true};
		}
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