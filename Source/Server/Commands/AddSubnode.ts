import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ClaimForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Others";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import { UserEdit, MapEdit } from "Server/CommandMacros";
import AddNode from "./AddNode";
import {Layer} from "Store/firebase/layers/@Layer";
import {GetAsync, GetAsync_Raw} from "Frame/Database/DatabaseHelpers";
import {GetLayer} from "../../Store/firebase/layers";
import {MapNodeRevision} from "Store/firebase/nodes/@MapNodeRevision";

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