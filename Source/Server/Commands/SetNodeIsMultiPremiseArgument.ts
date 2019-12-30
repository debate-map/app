import {MapEdit, UserEdit} from "Server/CommandMacros";
import {AddSchema, AssertValidate} from "vwebapp-framework";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetNode} from "Store/firebase/nodes";
import {MapNode} from "../../Store/firebase/nodes/@MapNode";

AddSchema("SetNodeIsMultiPremiseArgument_payload", {
	properties: {
		mapID: {type: "string"},
		nodeID: {type: "string"},
		multiPremiseArgument: {type: "boolean"},
	},
	required: ["nodeID", "multiPremiseArgument"],
});

@MapEdit
@UserEdit
export class SetNodeIsMultiPremiseArgument extends Command<{mapID?: number, nodeID: string, multiPremiseArgument: boolean}, {}> {
	oldNodeData: MapNode;
	newNodeData: MapNode;
	Validate() {
		const {mapID, nodeID, multiPremiseArgument} = this.payload;
		this.oldNodeData = GetNode(nodeID);
		AssertV(this.oldNodeData, "oldNodeData is null.");
		this.newNodeData = {...this.oldNodeData, ...{multiPremiseArgument}};
		AssertValidate("SetNodeIsMultiPremiseArgument_payload", this.payload, "Payload invalid");
		AssertValidate("MapNode", this.newNodeData, "New node-data invalid");
	}

	GetDBUpdates() {
		const {nodeID} = this.payload;
		const updates = {};
		updates[`nodes/${nodeID}`] = this.newNodeData;
		return updates;
	}
}