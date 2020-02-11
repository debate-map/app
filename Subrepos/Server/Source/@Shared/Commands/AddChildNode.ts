import {Assert, E} from "js-vextensions";
import {Command_Old, MergeDBUpdates, GetAsync, Command, AssertV} from "mobx-firelink";
import {AssertValidate} from "mobx-firelink";
import {MapEdit, UserEdit} from "../CommandMacros";
import {AddNode} from "./AddNode";
import {MapNode, ChildEntry, Polarity} from "../Store/firebase/nodes/@MapNode";
import {MapNodeRevision} from "../Store/firebase/nodes/@MapNodeRevision";
import {MapNodeType} from "../Store/firebase/nodes/@MapNodeType";
import {GetNode} from "../Store/firebase/nodes";

type Payload = {mapID: string, parentID: string, node: MapNode, revision: MapNodeRevision, link?: ChildEntry, asMapRoot?: boolean};

@MapEdit
@UserEdit
export class AddChildNode extends Command<Payload, {nodeID: string, revisionID: string}> {
	// set these from parent command if the parent command has earlier subs that increment last-node-id, etc.
	/* lastNodeID_addAmount = 0;
	lastNodeRevisionID_addAmount = 0; */

	sub_addNode: AddNode;
	parent_oldData: MapNode;
	Validate() {
		AssertValidate({
			properties: {
				mapID: {type: "string"}, parentID: {type: ["null", "string"]}, node: {$ref: "MapNode_Partial"}, revision: {$ref: "MapNodeRevision_Partial"}, link: {$ref: "ChildEntry"}, asMapRoot: {type: "boolean"},
			},
			required: ["mapID", "parentID", "node", "revision"],
		}, this.payload, "Payload invalid");

		const {mapID, parentID, node, revision, link, asMapRoot} = this.payload;
		AssertV(node.parents == null, "node.parents must be empty. Instead, supply a parentID property in the payload.");

		const node_withParents = E(node, parentID ? {parents: {[parentID]: {_: true}}} : {});
		this.sub_addNode = this.sub_addNode ?? new AddNode({mapID, node: node_withParents, revision}).MarkAsSubcommand(this);
		// this.sub_addNode.VSet({ lastNodeID_addAmount: this.lastNodeID_addAmount, lastNodeRevisionID_addAmount: this.lastNodeRevisionID_addAmount });
		this.sub_addNode.Validate();

		this.payload.link = link ?? E({_: true}, node.type == MapNodeType.Argument && {polarity: Polarity.Supporting});
		if (node.type == MapNodeType.Argument) {
			AssertV(this.payload.link.polarity != null, "An argument node must have its polarity specified in its parent-link.")
		}

		if (!asMapRoot && this.parentCommand == null) {
			// this.parent_oldChildrenOrder = await GetDataAsync('nodes', parentID, '.childrenOrder') as number[];
			this.parent_oldData = GetNode(parentID);
		}

		this.returnData = {
			nodeID: this.sub_addNode.nodeID,
			revisionID: this.sub_addNode.sub_addRevision.revisionID,
		};
	}

	GetDBUpdates() {
		const {parentID, link, asMapRoot} = this.payload;
		const updates = this.sub_addNode.GetDBUpdates();

		const newUpdates = {};
		// add as child of parent
		if (!asMapRoot) {
			newUpdates[`nodes/${parentID}/.children/.${this.sub_addNode.nodeID}`] = link;
			// if this node is being placed as a child of an argument, update the argument's children-order property
			if (this.parent_oldData && this.parent_oldData.type == MapNodeType.Argument) {
				newUpdates[`nodes/${parentID}/.childrenOrder`] = (this.parent_oldData.childrenOrder || []).concat([this.sub_addNode.nodeID]);
			}
		}

		return MergeDBUpdates(updates, newUpdates);
	}
}