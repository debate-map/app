import { MapEdit } from "Server/CommandMacros";
import { Assert } from "js-vextensions";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Map } from "../../Store/firebase/maps/@Map";
import { Command } from "../Command";
import { UserEdit } from "../CommandMacros";

AddSchema({
	properties: {
		mapID: {type: "number"},
		layerID: {type: "number"},
		attached: {type: "boolean"},
	},
	required: ["mapID", "layerID", "attached"],
}, "SetLayerAttachedToMap_payload");

@MapEdit
@UserEdit
export default class SetLayerAttachedToMap extends Command<{mapID: number, layerID: number, attached: boolean}> {
	Validate_Early() {
		AssertValidate("SetLayerAttachedToMap_payload", this.payload, `Payload invalid`);
	}

	oldData: Map;
	async Prepare() {
		let {mapID} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "maps", mapID) as Map;
	}
	async Validate() {
		Assert(this.oldData, "Map does not exist!");
	}
	
	GetDBUpdates() {
		let {mapID, layerID, attached} = this.payload;
		let updates = {};
		updates[`maps/${mapID}/layers/${layerID}`] = attached || null;
		updates[`layers/${layerID}/mapsWhereEnabled/${mapID}`] = attached || null;
		return updates;
	}
}