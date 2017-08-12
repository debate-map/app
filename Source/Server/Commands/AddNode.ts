import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import { UserEdit, MapEdit } from "Server/CommandMacros";

export default class AddNode extends Command<{node: MapNode, metaThesisNode?: MapNode}> {
	asSubcommand = false; // must be set to true, by a parent command, for this command to validate
	Validate_Early() {
		let {node, metaThesisNode} = this.payload;
		if (metaThesisNode) {
			Assert(node.children == null, `Node cannot specify children. (server adds meta-thesis automatically)`);
			Assert(node.childrenOrder == null, `Node cannot specify children-order. (server adds meta-thesis automatically)`);
			Assert(metaThesisNode.parents == null, `Meta-thesis cannot specify a parent. (server adds it automatically)`);
		}
	}

	lastNodeID_new: number;
	nodeID: number;
	metaThesisID: number;
	parentID: number;
	parent_oldChildrenOrder: number[];
	async Prepare() {
		let {node, metaThesisNode} = this.payload;

		this.lastNodeID_new = await GetDataAsync("general", "lastNodeID") as number;
		this.nodeID = ++this.lastNodeID_new;
		node.creator = this.userInfo.id;
		node.createdAt = Date.now();
		this.metaThesisID = metaThesisNode ? ++this.lastNodeID_new : null;

		if (metaThesisNode) {
			metaThesisNode.createdAt = Date.now();
			node.children = {[this.metaThesisID]: {_: true}};
			node.childrenOrder = [this.metaThesisID];
			metaThesisNode.parents = {[this.nodeID]: {_: true}};
		}
	}
	async Validate() {
		let {node, metaThesisNode} = this.payload;
		AssertValidate(`MapNode`, node, `Node invalid`);
		AssertValidate(`MapNode`, metaThesisNode, `Meta-thesis-node invalid`);
	}
	
	GetDBUpdates() {
		let {node, metaThesisNode} = this.payload;

		let updates = {};
		// add node
		updates["general/lastNodeID"] = this.lastNodeID_new;
		updates[`nodes/${this.nodeID}`] = node;

		// add as parent of (pre-existing) children
		for (let childID in (node.children || {}).Excluding(this.metaThesisID && this.metaThesisID.toString())) {
			updates[`nodes/${childID}/parents/${this.nodeID}`] = {_: true};
		}
		if (metaThesisNode) {
			// add meta-thesis
			updates[`nodes/${this.metaThesisID}`] = metaThesisNode;
			// add meta-thesis as parent of (pre-existing) children
			for (let childID in metaThesisNode.children) {
				updates[`nodes/${childID}/parents/${this.metaThesisID}`] = {_: true};
			}
		}
		return updates;
	}
}