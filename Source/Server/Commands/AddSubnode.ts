import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ThesisForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import { UserEdit, MapEdit } from "Server/CommandMacros";
import AddNode from "./AddNode";
import {Layer} from "Store/firebase/layers/@Layer";
import {GetAsync} from "Frame/Database/DatabaseHelpers";
import {GetLayer} from "../../Store/firebase/layers";

@UserEdit
export default class AddSubnode extends Command<{layerID: number, anchorNodeID: number, subnode: MapNode}> {
	sub_addNode: AddNode;
	layer_oldData: Layer;
	async Prepare() {
		let {layerID, anchorNodeID, subnode} = this.payload;

		this.sub_addNode = new AddNode({node: subnode});
		this.sub_addNode.asSubcommand = true;
		await this.sub_addNode.Prepare();

		this.layer_oldData = await GetAsync(()=>GetLayer(layerID));

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

		return MergeDBUpdates(updates, newUpdates);
	}
}