import { UserEdit } from "Server/CommandMacros";
import { Layer } from "Store/firebase/layers/@Layer";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Command } from "../Command";

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