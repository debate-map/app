import {Command, CommandMeta, DBHelper, dbp, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetMapNodeEdits} from "../DB/mapNodeEdits.js";
import {MapNodeEdit} from "../DB/mapNodeEdits/@MapNodeEdit.js";
import {GetMap} from "../DB/maps.js";
import {DMap} from "../DB/maps/@Map.js";
import {UserMapInfoSet} from "../DB/userMapInfo/@UserMapInfo.js";
import {DeleteNode} from "./DeleteNode.js";
import {PERMISSIONS} from "../DB.js";

@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeleteMap extends Command<{id: string}, {}> {
	oldData: DMap;
	userMapInfoSets: UserMapInfoSet[];
	sub_deleteNode: DeleteNode;
	nodeEdits: MapNodeEdit[];
	Validate() {
		const {id} = this.input;
		this.oldData = GetMap.NN(id);
		AssertV(PERMISSIONS.Map.Delete(this.userInfo.id, this.oldData));
		//this.userMapInfoSets = GetDocs({}, a=>a.userMapInfo) || [];

		this.IntegrateSubcommand(()=>this.sub_deleteNode, null, ()=>new DeleteNode({mapID: id, nodeID: this.oldData.rootNode}), a=>a.asPartOfMapDelete = true);
		// todo: use parents recursion on l2 nodes to make sure they're all connected to at least one other map root

		this.nodeEdits = GetMapNodeEdits(id);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.input;
		db.add(this.sub_deleteNode.GetDBUpdates(db));
		db.set(dbp`maps/${id}`, null);
		/*for (const userMapInfoSet of this.userMapInfoSets) {
			const userID = userMapInfoSet.id;
			for (const {key: mapID2, value: userMapInfo} of CE(userMapInfoSet.maps).Pairs()) {
				if (mapID2 == mapID) {
					newUpdates[dbp`userMapInfo/${userID}/.${mapID}`] = null;
				}
			}
		}*/

		// delete entries in mapNodeEdits
		for (const edit of this.nodeEdits) {
			db.set(dbp`mapNodeEdits/${edit.id}`, null);
		}
	}
}