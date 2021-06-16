import {Assert} from "web-vcore/nm/js-vextensions";
import {MapEdit} from "../CommandMacros";
import {AddSchema, AssertValidate} from "web-vcore/nm/mobx-graphlink";
import {Command_Old, GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {Map} from "../Store/firebase/maps/@Map";
import {GetMap} from "../Store/firebase/maps";

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