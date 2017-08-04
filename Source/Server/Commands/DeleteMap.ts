import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {IsArgumentNode} from "../../Store/firebase/nodes/$node";
import {Map} from "../../Store/firebase/maps/@Map";
import DeleteNode from "Server/Commands/DeleteNode";
import {UserEdit} from "Server/CommandMacros";

@UserEdit
export default class DeleteMap extends Command<{mapID: number}> {
	oldData: Map;
	sub_deleteNode: DeleteNode;
	async Prepare() {
		let {mapID} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "maps", mapID) as Map;

		this.sub_deleteNode = new DeleteNode({mapID, nodeID: this.oldData.rootNode});
		this.sub_deleteNode.Validate_Early();
		await this.sub_deleteNode.Prepare();
	}
	async Validate() {
		await this.sub_deleteNode.Validate();
	}

	GetDBUpdates() {
		let {mapID} = this.payload;
		let updates = this.sub_deleteNode.GetDBUpdates();
		let newUpdates = {};
		newUpdates[`maps/${mapID}`] = null;
		return MergeDBUpdates(updates, newUpdates);
	}
}