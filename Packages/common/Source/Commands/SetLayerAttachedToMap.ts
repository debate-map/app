import {Assert} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, AssertValidate, GetAsync, Command, AssertV, CommandMeta} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {Map} from "../DB/maps/@Map.js";
import {GetMap} from "../DB/maps.js";

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			mapID: {type: "string"},
			layerID: {type: "string"},
			attached: {type: "boolean"},
		},
		required: ["mapID", "layerID", "attached"],
	}),
})
export class SetLayerAttachedToMap extends Command<{mapID: string, layerID: string, attached: boolean}, {}> {
	oldData: Map;
	Validate() {
		const {mapID} = this.payload;
		this.oldData = GetMap.NN(mapID);
		AssertV(this.oldData, "Map does not exist!");
	}

	DeclareDBUpdates(db) {
		const {mapID, layerID, attached} = this.payload;
		db.set(`maps/${mapID}/.layers/.${layerID}`, attached || null);
		db.set(`layers/${layerID}/.mapsWhereEnabled/.${mapID}`, attached || null);
	}
}