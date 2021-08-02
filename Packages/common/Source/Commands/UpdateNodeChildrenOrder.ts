import {AddSchema, AssertValidate, GetAsync, Command, AssertV, DBHelper, dbp} from "web-vcore/nm/mobx-graphlink.js";

import {MapEdit, UserEdit} from "../CommandMacros.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {GetNode} from "../DB/nodes.js";
import {HasAdminPermissions, IsUserCreatorOrMod} from "../DB/users/$user.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";
import {IsMultiPremiseArgument} from "../DB/nodes/$node.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@MapEdit
@UserEdit
export class UpdateNodeChildrenOrder extends Command<{mapID?: string, nodeID: string, childrenOrder: string[]}, {}> {
	oldNodeData: MapNode;
	newNodeData: MapNode;
	Validate() {
		/*AssertValidate({
			properties: {
				mapID: {type: "string"},
				nodeID: {type: "string"},
				childrenOrder: {items: {type: "string"}},
			},
			required: ["nodeID", "childrenOrder"],
		}, this.payload, "Payload invalid");

		const {mapID, nodeID, childrenOrder} = this.payload;
		const node = this.oldNodeData = GetNode(nodeID);
		AssertUserCanModify(this, this.oldNodeData);

		const changeableForNonAdmins = IsPrivateNode(node) || IsMultiPremiseArgument(node);
		const changeable_final = (IsUserCreatorOrMod(this.userInfo.id, node) && changeableForNonAdmins) || HasAdminPermissions(this.userInfo.id);
		AssertV(changeable_final, "You don't have permission to change this node's children-order.");
		
		this.newNodeData = {...this.oldNodeData, childrenOrder};
		AssertValidate("MapNode", this.newNodeData, "New node-data invalid");*/

		// todo: this should basically
		// 1) verify the actor has permission (currently, this is basically just whether they're the parent-node owner)
		// 2) search for parent-child-links for each child that is owned by the actor (creating them if necessary)
		// 3) update their "slot" to match the provided order
	}

	DeclareDBUpdates(db: DBHelper) {
		const {nodeID} = this.payload;
		db.set(dbp`nodes/${nodeID}`, this.newNodeData);
	}
}