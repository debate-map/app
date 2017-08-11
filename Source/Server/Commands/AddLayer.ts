import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import AddNode from "./AddNode";
import {UserEdit} from "Server/CommandMacros";
import {Layer} from "Store/firebase/layers/@Layer";

@UserEdit
export default class AddLayer extends Command<{layer: Layer}> {
	layerID: number;
	async Prepare() {
		let {layer} = this.payload;

		let lastLayerID = await GetDataAsync("general", "lastLayerID") as number;
		this.layerID = lastLayerID + 1;
		layer.createdAt = Date.now();
	}
	async Validate() {
		let {layer} = this.payload;
		AssertValidate("Layer", layer, `Layer invalid`);
	}
	
	GetDBUpdates() {
		let {layer} = this.payload;
		let updates = {
			"general/lastLayerID": this.layerID,
			[`layers/${this.layerID}`]: layer,
		} as any;
		return updates;
	}
}