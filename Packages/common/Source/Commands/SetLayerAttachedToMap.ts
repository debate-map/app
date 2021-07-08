import {Assert} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, AssertValidate, GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";

import {MapEdit, UserEdit} from "../CommandMacros.js";

import {Map} from "../DB/maps/@Map.js";
import {GetMap} from "../DB/maps.js";

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
		this.oldData = GetMap.BIN(mapID);
		AssertV(this.oldData, "Map does not exist!");
	}

	DeclareDBUpdates(db) {
		const {mapID, layerID, attached} = this.payload;
		db.set(`maps/${mapID}/.layers/.${layerID}`, attached || null);
		db.set(`layers/${layerID}/.mapsWhereEnabled/.${mapID}`, attached || null);
	}
}