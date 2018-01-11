import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ClaimForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";

export default class NotifyNodeViewed extends Command<{nodeID: number}> {
	async Prepare() {}
	async Validate() {
		let {nodeID} = this.payload;
		let nodeData = await GetDataAsync("nodes", nodeID) as MapNode;
		Assert(nodeData, "Node must exist for you to view it!");
	}
	
	GetDBUpdates() {
		let {nodeID} = this.payload;

		let updates = {};
		updates[`nodeViewers/${nodeID}/${this.userInfo.id}`] = true;
		updates[`userViewedNodes/${this.userInfo.id}/${nodeID}`] = true;
		return updates;
	}
}