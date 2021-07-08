import {Command, dbp} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {GetMap} from "../DB/maps.js";
import {Map} from "../DB/maps/@Map.js";
import {UserMapInfoSet} from "../DB/userMapInfo/@UserMapInfo.js";
import {DeleteNode} from "./DeleteNode.js";
import {AssertUserCanDelete} from "./Helpers/SharedAsserts.js";

@UserEdit
export class DeleteMap extends Command<{mapID: string}, {}> {
	oldData: Map;
	userMapInfoSets: UserMapInfoSet[];
	sub_deleteNode: DeleteNode;
	Validate() {
		const {mapID} = this.payload;
		this.oldData = GetMap.BIN(mapID);
		AssertUserCanDelete(this, this.oldData);
		//this.userMapInfoSets = GetDocs({}, a=>a.userMapInfo) || [];

		this.sub_deleteNode = this.sub_deleteNode ?? new DeleteNode({mapID, nodeID: this.oldData.rootNode}).MarkAsSubcommand(this);
		this.sub_deleteNode.asPartOfMapDelete = true;
		this.sub_deleteNode.Validate();
		// todo: use parents recursion on l2 nodes to make sure they're all connected to at least one other map root
	}

	DeclareDBUpdates(db) {
		const {mapID} = this.payload;
		db.add(this.sub_deleteNode.GetDBUpdates());
		db.set(dbp`maps/${mapID}`, null);
		/*for (const userMapInfoSet of this.userMapInfoSets) {
			const userID = userMapInfoSet.id;
			for (const {key: mapID2, value: userMapInfo} of CE(userMapInfoSet.maps).Pairs()) {
				if (mapID2 == mapID) {
					newUpdates[dbp`userMapInfo/${userID}/.${mapID}`] = null;
				}
			}
		}*/
		// delete entry in mapNodeEditTimes
		db.set(dbp`mapNodeEditTimes/${mapID}`, null);
	}
}