import {Assert} from "web-vcore/nm/js-vextensions.js";
import {MapEdit} from "../CommandMacros.js";
import {AddSchema, AssertValidate} from "web-vcore/nm/mobx-graphlink.js";
import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Map} from "../Store/db/maps/@Map.js";
import {GetMap} from "../Store/db/maps.js";

AddSchema("SetLayerAttachedToMap_payload", {
	properties: {
		mapID: {type: "string"},
		layerID: {type: "string"},
		attached: {type: "boolean"},
	},
	required: ["mapID", "layerID", "attached"],
});

@MapEdit
@UserEdit
export class SetLayerAttachedToMap extends Command<{mapID: string, layerID: string, attached: boolean}, {}> {
	Validate_Early() {
		AssertValidate("SetLayerAttachedToMap_payload", this.payload, "Payload invalid");
	}

	oldData: Map;
	Validate() {
		const {mapID} = this.payload;
		this.oldData = GetMap(mapID);
		AssertV(this.oldData, "Map does not exist!");
	}

	GetDBUpdates() {
		const {mapID, layerID, attached} = this.payload;
		const updates = {};
		updates[`maps/${mapID}/.layers/.${layerID}`] = attached || null;
		updates[`layers/${layerID}/.mapsWhereEnabled/.${mapID}`] = attached || null;
		return updates;
	}
}