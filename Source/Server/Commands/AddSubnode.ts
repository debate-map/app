import { GetAsync_Raw } from "Frame/Database/DatabaseHelpers";
import { UserEdit } from "Server/CommandMacros";
import { Layer } from "Store/firebase/layers/@Layer";
import { MapNodeRevision } from "Store/firebase/nodes/@MapNodeRevision";
import { GetLayer } from "../../Store/firebase/layers";
import { MapNode } from "../../Store/firebase/nodes/@MapNode";
import { Command, MergeDBUpdates } from "../Command";
import {AddNode} from "./AddNode";

@UserEdit
export default class AddSubnode extends Command<{mapID: number, layerID: number, anchorNodeID: number, subnode: MapNode, subnodeRevision: MapNodeRevision}> {
	sub_addNode: AddNode;
	layer_oldData: Layer;
	async Prepare() {
		let {mapID, layerID, anchorNodeID, subnode, subnodeRevision} = this.payload;

		this.sub_addNode = new AddNode({mapID, node: subnode, revision: subnodeRevision}).MarkAsSubcommand();
		await this.sub_addNode.Prepare();

		this.layer_oldData = await GetAsync_Raw(()=>GetLayer(layerID));

		this.returnData = this.sub_addNode.nodeID;
	}
	async Validate() {
		await this.sub_addNode.Validate();
	}
	
	GetDBUpdates() {
		let {layerID, anchorNodeID, subnode} = this.payload;
		let updates = this.sub_addNode.GetDBUpdates();

		let newUpdates = {};
		// add into layer
		newUpdates[`layers/${layerID}/nodeSubnodes/${anchorNodeID}/${this.sub_addNode.nodeID}`] = true;
		let layerPlusAnchorStr = `${layerID}_${anchorNodeID}`;
		newUpdates[`nodes/${this.sub_addNode.nodeID}/layerPlusAnchorParents/${layerPlusAnchorStr}`] = true;

		return MergeDBUpdates(updates, newUpdates);
	}
}