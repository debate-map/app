import {AssertV, Command, MergeDBUpdates} from "mobx-firelink";
import {UserEdit} from "../CommandMacros";
import {AddNode} from "./AddNode";
import {MapNode} from "../Store/firebase/nodes/@MapNode";
import {MapNodeRevision} from "../Store/firebase/nodes/@MapNodeRevision";
import {Layer} from "../Store/firebase/layers/@Layer";
import {GetLayer} from "../Store/firebase/layers";

@UserEdit
export class AddSubnode extends Command<{mapID: string, layerID: string, anchorNodeID: string, subnode: MapNode, subnodeRevision: MapNodeRevision}, number> {
	sub_addNode: AddNode;
	layer_oldData: Layer;
	Validate() {
		const {mapID, layerID, anchorNodeID, subnode, subnodeRevision} = this.payload;

		this.sub_addNode = this.sub_addNode ?? new AddNode({mapID, node: subnode, revision: subnodeRevision}).MarkAsSubcommand(this);
		this.sub_addNode.Validate();

		this.layer_oldData = GetLayer(layerID);
		AssertV(this.layer_oldData, "layer_oldData is null.");

		this.returnData = this.sub_addNode.nodeID;

		this.sub_addNode.Validate();
	}

	GetDBUpdates() {
		const {layerID, anchorNodeID, subnode} = this.payload;
		const updates = this.sub_addNode.GetDBUpdates();

		const newUpdates = {};
		// add into layer
		newUpdates[`layers/${layerID}/.nodeSubnodes/.${anchorNodeID}/.${this.sub_addNode.nodeID}`] = true;
		const layerPlusAnchorStr = `${layerID}+${anchorNodeID}`;
		newUpdates[`nodes/${this.sub_addNode.nodeID}/.layerPlusAnchorParents/.${layerPlusAnchorStr}`] = true;
		/* newUpdates[`nodes/${this.sub_addNode.nodeID}/.layerOwner`] = layerID;
		newUpdates[`nodes/${this.sub_addNode.nodeID}/.layerAnchorNode`] = anchorNodeID; */

		return MergeDBUpdates(updates, newUpdates);
	}
}