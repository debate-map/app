import {MapEdit, UserEdit} from "../CommandMacros";
import {AddSchema, AssertValidate} from "mobx-firelink";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {MapNode} from "../Store/firebase/nodes/@MapNode";
import {GetNode} from "../Store/firebase/nodes";
import {HasAdminPermissions, IsUserCreatorOrMod} from "../Store/firebase/users/$user";
import {MapNodeType} from "../Store/firebase/nodes/@MapNodeType";
import {IsPrivateNode, IsMultiPremiseArgument} from "../Store/firebase/nodes/$node";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

@MapEdit
@UserEdit
export class UpdateNodeChildrenOrder extends Command<{mapID?: string, nodeID: string, childrenOrder: string[]}, {}> {
	oldNodeData: MapNode;
	newNodeData: MapNode;
	Validate() {
		AssertValidate({
			properties: {
				mapID: {type: "string"},
				nodeID: {type: "string"},
				childrenOrder: {items: {type: "string"}},
			},
			required: ["nodeID", "childrenOrder"],
		}, this.payload, "Payload invalid");

		const {mapID, nodeID, childrenOrder} = this.payload;
		const node = this.oldNodeData = GetNode(nodeID);
		AssertExistsAndUserIsCreatorOrMod(this, this.oldNodeData, "update");

		const changeableForNonAdmins = IsPrivateNode(node) || IsMultiPremiseArgument(node);
		const changeable_final = (IsUserCreatorOrMod(this.userInfo.id, node) && changeableForNonAdmins) || HasAdminPermissions(this.userInfo.id);
		AssertV(changeable_final, "You don't have permission to change this node's children-order.");
		
		this.newNodeData = {...this.oldNodeData, ...{childrenOrder}};
		AssertValidate("MapNode", this.newNodeData, "New node-data invalid");
	}

	GetDBUpdates() {
		const {nodeID} = this.payload;
		const updates = {};
		updates[`nodes/${nodeID}`] = this.newNodeData;
		return updates;
	}
}