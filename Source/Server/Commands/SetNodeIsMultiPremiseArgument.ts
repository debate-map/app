import { MapEdit, UserEdit } from "Server/CommandMacros";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { MapNode } from "../../Store/firebase/nodes/@MapNode";
import { Command } from "../Command";

AddSchema({
	properties: {
		mapID: {type: "number"},
		nodeID: {type: "number"},
		multiPremiseArgument: {type: "boolean"},
	},
	required: ["nodeID", "multiPremiseArgument"],
}, "SetNodeIsMultiPremiseArgument_payload");

@MapEdit
@UserEdit
export default class SetNodeIsMultiPremiseArgument extends Command<{mapID?: number, nodeID: number, multiPremiseArgument: boolean}> {
	Validate_Early() {
		AssertValidate("SetNodeIsMultiPremiseArgument_payload", this.payload, `Payload invalid`);
	}

	oldNodeData: MapNode;
	newNodeData: MapNode;
	async Prepare() {
		let {mapID, nodeID, multiPremiseArgument} = this.payload;
		this.oldNodeData = await GetDataAsync({addHelpers: false}, "nodes", nodeID) as MapNode;
		this.newNodeData = {...this.oldNodeData, ...{multiPremiseArgument}};
	}
	async Validate() {
		AssertValidate("MapNode", this.newNodeData, `New node-data invalid`);
	}
	
	GetDBUpdates() {
		let {nodeID} = this.payload;
		let updates = {};
		updates[`nodes/${nodeID}`] = this.newNodeData;
		return updates;
	}
}