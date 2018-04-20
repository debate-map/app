import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ClaimForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "js-vextensions";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import { UserEdit, MapEdit } from "Server/CommandMacros";

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