import { MapEdit } from "Server/CommandMacros";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Map, Map_namePattern } from "../../Store/firebase/maps/@Map";
import { Command } from "../Command";
import { UserEdit } from "../CommandMacros";

AddSchema({
	properties: {
		mapID: {type: "number"},
		mapUpdates: Schema({
			properties: {
				name: {type: "string", pattern: Map_namePattern},
				note: {type: "string"},
				noteInline: {type: "boolean"},
				defaultExpandDepth: {type: "number"},
			},
		}),
	},
	required: ["mapID", "mapUpdates"],
}, "UpdateMapDetails_payload");

@MapEdit
@UserEdit
export default class UpdateMapDetails extends Command<{mapID: number, mapUpdates: Partial<Map>}> {
	Validate_Early() {
		AssertValidate("UpdateMapDetails_payload", this.payload, `Payload invalid`);
	}

	oldData: Map;
	newData: Map;
	async Prepare() {
		let {mapID, mapUpdates} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "maps", mapID) as Map;
		this.newData = {...this.oldData, ...mapUpdates};
		this.newData.editedAt = Date.now();
	}
	async Validate() {
		AssertValidate("Map", this.newData, `New map-data invalid`);
	}
	
	GetDBUpdates() {
		let {mapID, mapUpdates} = this.payload;
		let updates = {};
		updates[`maps/${mapID}`] = this.newData;
		return updates;
	}
}