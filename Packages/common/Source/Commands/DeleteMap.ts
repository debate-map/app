import {UserEdit} from "../CommandMacros";
import {MergeDBUpdates, GetAsync, GetDocs, AssertV, Command} from "web-vcore/nm/mobx-graphlink";
import {UserMapInfoSet} from "../Store/db/userMapInfo/@UserMapInfo";
import {DeleteNode} from "./DeleteNode";
import {GetMap} from "../Store/db/maps";
import {Map} from "../Store/db/maps/@Map";
import {CE} from "web-vcore/nm/js-vextensions";
import {IsUserCreatorOrMod} from "../Store/db/users/$user";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts";

@UserEdit
export class DeleteMap extends Command<{mapID: string}, {}> {
	oldData: Map;
	userMapInfoSets: UserMapInfoSet[];
	sub_deleteNode: DeleteNode;
	Validate() {
		const {mapID} = this.payload;
		this.oldData = GetMap(mapID);
		AssertUserCanDelete(this, this.oldData);
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
			for (const {key: mapID2, value: userMapInfo} of CE(userMapInfoSet.maps).Pairs()) {
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