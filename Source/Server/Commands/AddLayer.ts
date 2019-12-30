import {UserEdit} from "Server/CommandMacros";
import {Layer} from "Store/firebase/layers/@Layer";
import {GenerateUUID} from "Utils/General/KeyGenerator";
import {Command_Old, Command} from "mobx-firelink";
import {AssertValidate} from "vwebapp-framework";

@UserEdit
export class AddLayer extends Command<{layer: Layer}, {}> {
	layerID: string;
	Validate() {
		const {layer} = this.payload;
		this.layerID = this.layerID ?? GenerateUUID();
		layer.createdAt = Date.now();
		AssertValidate("Layer", layer, "Layer invalid");
	}

	GetDBUpdates() {
		const {layer} = this.payload;
		const updates = {
			// 'general/data/.lastLayerID': this.layerID,
			[`layers/${this.layerID}`]: layer,
		} as any;
		return updates;
	}
}