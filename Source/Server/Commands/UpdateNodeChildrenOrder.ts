import {MapEdit, UserEdit} from "Server/CommandMacros";
import {AddSchema, AssertValidate} from "vwebapp-framework";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetNode} from "Store/firebase/nodes";
import {MapNode} from "../../Store/firebase/nodes/@MapNode";

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
		this.oldNodeData = GetNode(nodeID);
		AssertV(this.oldNodeData, "oldNodeData is null.");
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