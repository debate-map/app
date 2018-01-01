import {GetNodeAsync, GetNode, GetNodeChildren} from "../../Store/firebase/nodes";
import {Assert} from "js-vextensions";
import {GetDataAsync, GetAsync, RemoveHelpers} from "../../Frame/Database/DatabaseHelpers";
import { Command, MergeDBUpdates } from "../Command";
import {MapNode, ThesisForm, ChildEntry} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetNodeForm, IsArgumentNode, IsArgumentType} from "../../Store/firebase/nodes/$node";
import AddNode from "./AddNode";
import LinkNode from "./LinkNode";
import {SplitStringBySlash_Cached} from "Frame/Database/StringSplitCache";
import AddChildNode from "./AddChildNode";

export default class CloneNode extends Command<{mapID: number, baseNodePath: string, newParentID: number}> {
	sub_addNode: AddChildNode;
	sub_linkChildren: LinkNode[];
	async Prepare() {
		let {mapID, baseNodePath, newParentID} = this.payload;

		// prepare add-node
		// ==========

		let baseNodeID = SplitStringBySlash_Cached(baseNodePath).map(a=>a.ToInt()).Last();
		let baseNode = await GetAsync(()=>GetNode(baseNodeID)) as MapNode;
		let isArgument = IsArgumentNode(baseNode);
		
		let nodeForm = await GetAsync(()=>GetNodeForm(baseNode, baseNodePath)) as ThesisForm;
		let baseMetaThesis = isArgument ? (await GetAsync(()=>GetNodeChildren(baseNode))).First(a=>a.metaThesis != null) : null;

		let newChildNode = RemoveHelpers(Clone(baseNode)) as MapNode;
		newChildNode.parents = {[newParentID]: {_: true}}; // make new node's only parent the one on this path
		delete newChildNode.children;
		delete newChildNode.childrenOrder;

		if (isArgument) {
			var metaThesisNode = RemoveHelpers(Clone(baseMetaThesis)).VSet({parents: null}) as MapNode;
		}
		this.sub_addNode = new AddChildNode({mapID, node: newChildNode, link: E({_: true}, nodeForm && {form: nodeForm}) as any, metaThesisNode});
		this.sub_addNode.Validate_Early();
		await this.sub_addNode.Prepare();

		// prepare link-children
		// ==========

		let childrenToLink = (baseNode.children || {}).VKeys(true).map(a=>a.ToInt());
		if (isArgument) {
			// if argument, use childrenOrder instead, since it's sorted
			childrenToLink = (baseNode.childrenOrder || []).slice();
			childrenToLink.Remove(baseNode.childrenOrder[0]); // but don't link old-meta-thesis
		}

		this.sub_linkChildren = [];
		for (let childID of childrenToLink) {
			let child = await GetAsync(()=>GetNode(childID)) as MapNode;
			let childForm = await GetAsync(()=>GetNodeForm(child, baseNodePath + "/" + childID)) as ThesisForm;
			let linkChildSub = new LinkNode({mapID, parentID: this.sub_addNode.sub_addNode.nodeID, childID: childID, childForm});
			linkChildSub.Validate_Early();

			//linkChildSub.Prepare([]);
			/*let dbUpdates = this.GetDBUpdates();
			let node_childrenOrder = dbUpdates[`nodes/${this.sub_addNode.nodeID}/childrenOrder`];
			linkChildSub.Prepare(node_childrenOrder);*/
			await linkChildSub.Prepare();

			this.sub_linkChildren.push(linkChildSub);
		}
	}
	async Validate() {
		this.sub_addNode.Validate();
		for (let sub of this.sub_linkChildren) {
			sub.Validate();
		}
	}
	
	GetDBUpdates() {
		let updates = this.sub_addNode.GetDBUpdates();
		for (let sub of this.sub_linkChildren) {
			//updates.Extend(sub.GetDBUpdates());
			updates = MergeDBUpdates(updates, sub.GetDBUpdates());
		}

		// override the setting of new-node/childrenOrder (otherwise each link-node sub-command tries to set it to: [old-list] + [its-own-child])
		//updates[`nodes/${this.sub_addNode.nodeID}/childrenOrder`] = this.sub_linkChildren.map(a=>a.payload.childID);
		if (IsArgumentType(this.sub_addNode.payload.node.type)) {
			let childrenOrder = [];
			if (this.sub_addNode.sub_addNode.metaThesisID) {
				childrenOrder.push(this.sub_addNode.sub_addNode.metaThesisID);
			}
			childrenOrder.push(...this.sub_linkChildren.map(a=>a.payload.childID));
			updates[`nodes/${this.sub_addNode.sub_addNode.nodeID}`].childrenOrder = childrenOrder;
		}

		return updates;
	}
}