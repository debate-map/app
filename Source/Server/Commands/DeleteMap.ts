import { GetAsync_Raw } from "Frame/Database/DatabaseHelpers";
import { UserEdit } from "Server/CommandMacros";
import {DeleteNode} from "Server/Commands/DeleteNode";
import { GetMap } from "Store/firebase/maps";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Map } from "../../Store/firebase/maps/@Map";
import { UserMapInfoSet } from "../../Store/firebase/userMapInfo/@UserMapInfo";
import { Command, MergeDBUpdates } from "../Command";

@UserEdit
export default class DeleteMap extends Command<{mapID: number}> {
	oldData: Map;
	userMapInfoSets: {[key: string]: UserMapInfoSet};
	sub_deleteNode: DeleteNode;
	async Prepare() {
		let {mapID} = this.payload;
		this.oldData = await GetAsync_Raw(()=>GetMap(mapID));
		this.userMapInfoSets = (await GetDataAsync("userMapInfo") as {[key: string]: UserMapInfoSet}) || {};

		this.sub_deleteNode = new DeleteNode({mapID, nodeID: this.oldData.rootNode});
		this.sub_deleteNode.asPartOfMapDelete = true;
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
		for (let {name: userID, value: userMapInfoSet} of this.userMapInfoSets.Props(true)) {
			for (let {name: mapID2, value: userMapInfo} of userMapInfoSet.Props(true)) {
				if (parseInt(mapID2) == mapID) {
					newUpdates[`userMapInfo/${userID}/${mapID}`] = null;
				}
			}
		}
		// delete mapNodeEditTimes
		newUpdates[`mapNodeEditTimes/${mapID}`] = null;
		updates = MergeDBUpdates(updates, newUpdates);

		return updates;
	}
}