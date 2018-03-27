import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ClaimForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Others";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {Map_namePattern, Map} from "../../Store/firebase/maps/@Map";
import {UserEdit} from "../CommandMacros";
import {MapEdit} from "Server/CommandMacros";
import {GetUserMapInfo} from "../../Store/firebase/userMapInfo";

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