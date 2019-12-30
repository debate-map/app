import {UserEdit} from "Server/CommandMacros";
import {DeleteNode} from "Server/Commands/DeleteNode";
import {GetMap} from "Store/firebase/maps";
import {Command_Old, MergeDBUpdates, GetAsync, GetDocs, AssertV, Command} from "mobx-firelink";
import {MapNode} from "Store/firebase/nodes/@MapNode";
import {Map} from "../../Store/firebase/maps/@Map";
import {UserMapInfoSet} from "../../Store/firebase/userMapInfo/@UserMapInfo";

@UserEdit
export class DeleteMap extends Command<{mapID: string}, {}> {
	oldData: Map;
	userMapInfoSets: UserMapInfoSet[];
	sub_deleteNode: DeleteNode;
	Validate() {
		const {mapID} = this.payload;
		this.oldData = GetMap(mapID);
		AssertV(this.oldData, "oldData is null.");
		this.userMapInfoSets = GetDocs({}, a=>a.userMapInfo) || [];

		this.sub_deleteNode = this.sub_deleteNode ?? new DeleteNode({mapID, nodeID: this.oldData.rootNode}).MarkAsSubcommand(this);
		this.sub_deleteNode.asPartOfMapDelete = true;
		this.sub_deleteNode.Validate();
		// todo: use parents recursion on l2 nodes to make sure they're all connected to at least one other map root
	}

	GetDBUpdates() {
		const {mapID} = this.payload;
		let updates = this.sub_deleteNode.GetDBUpdates();

		const newUpdates = {};
		newUpdates[`maps/${mapID}`] = null;
		for (const userMapInfoSet of this.userMapInfoSets) {
			const userID = userMapInfoSet._key;
			for (const {key: mapID2, value: userMapInfo} of userMapInfoSet.maps.Pairs(true)) {
				if (mapID2 == mapID) {
					newUpdates[`userMapInfo/${userID}/.${mapID}`] = null;
				}
			}
		}
		// delete entry in mapNodeEditTimes
		newUpdates[`mapNodeEditTimes/${mapID}`] = null;
		updates = MergeDBUpdates(updates, newUpdates);

		return updates;
	}
}