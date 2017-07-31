import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {Map_nameFormat, Map} from "../../Store/firebase/maps/@Map";

AddSchema({
	properties: {
		mapID: {type: "number"},
		mapUpdates: Schema({
			properties: {
				name: {type: "string", pattern: Map_nameFormat},
				defaultExpandDepth: {type: "number"},
			},
		}),
	},
	required: ["mapID", "mapUpdates"],
}, "UpdateMapDetails_payload");

export default class UpdateMapDetails extends Command<{mapID: number, mapUpdates: Partial<Map>}> {
	Validate_Early() {
		AssertValidate("UpdateMapDetails_payload", this.payload, `Payload invalid`);
	}

	oldMapData: Map;
	newMapData: Map;
	async Prepare() {
		let {mapID, mapUpdates} = this.payload;
		this.oldMapData = await GetDataAsync({addHelpers: false}, "maps", mapID) as Map;
		this.newMapData = {...this.oldMapData, ...mapUpdates};
	}
	async Validate() {
		AssertValidate("Map", this.newMapData, `New map-data invalid`);
	}
	
	GetDBUpdates() {
		let {mapID, mapUpdates} = this.payload;
		let updates = {};
		updates[`maps/${mapID}`] = this.newMapData;
		return updates;
	}
}