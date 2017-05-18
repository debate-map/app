import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";

export default class AddNode extends Command<{node: MapNode, link: ChildEntry, metaThesisNode?: MapNode}> {
	Validate_Early() {
		let {node, link, metaThesisNode} = this.payload;
		
		Assert(node.parents && node.parents.VKeys().length == 1, `Node must have exactly one parent`);
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
		let {node, link, metaThesisNode} = this.payload;
		let firebase = store.firebase.helpers;

		this.lastNodeID_new = await GetDataAsync(`general/lastNodeID`) as number;
		this.nodeID = ++this.lastNodeID_new;
		this.metaThesisID = metaThesisNode ? ++this.lastNodeID_new : null;

		if (metaThesisNode) {
			node.children = {[this.metaThesisID]: {_: true}};
			node.childrenOrder = [this.metaThesisID];
			metaThesisNode.parents = {[this.nodeID]: {_: true}};
		}

		this.parentID = node.parents.VKeys(true)[0].ToInt();
		this.parent_oldChildrenOrder = await GetDataAsync(`nodes/${this.parentID}/childrenOrder`) as number[];
	}
	async Validate() {
		let {node, link, metaThesisNode} = this.payload;
		AssertValidate(`MapNode`, node, `Node invalid`);
		AssertValidate(`ChildEntry`, link, `Link invalid`);
		AssertValidate(`MapNode`, metaThesisNode, `Meta-thesis-node invalid`);
	}
	
	GetDBUpdates() {
		let {node, link, metaThesisNode} = this.payload;

		let updates = {};
		// add node
		updates["general/lastNodeID"] = this.lastNodeID_new;
		updates[`nodes/${this.nodeID}`] = node;
		// add as child of parent
		updates[`nodes/${this.parentID}/children/${this.nodeID}`] = link;
		if (this.parent_oldChildrenOrder) {
			updates[`nodes/${this.parentID}/childrenOrder`] = this.parent_oldChildrenOrder.concat([this.nodeID]);
		}
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