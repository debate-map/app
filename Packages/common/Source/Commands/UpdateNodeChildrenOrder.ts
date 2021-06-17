import {MapEdit, UserEdit} from "../CommandMacros";
import {AddSchema, AssertValidate} from "web-vcore/nm/mobx-graphlink";
import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {MapNode} from "../Store/db/nodes/@MapNode";
import {GetNode} from "../Store/db/nodes";
import {HasAdminPermissions, IsUserCreatorOrMod} from "../Store/db/users/$user";
import {MapNodeType} from "../Store/db/nodes/@MapNodeType";
import {IsPrivateNode, IsMultiPremiseArgument} from "../Store/db/nodes/$node";
import {AssertUserCanModify} from "./Helpers/SharedAsserts";

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
		AssertUserCanModify(this, this.oldNodeData);

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