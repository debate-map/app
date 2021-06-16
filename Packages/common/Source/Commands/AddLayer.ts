import {UserEdit} from "../CommandMacros";
import {Command_Old, Command} from "web-vcore/nm/mobx-graphlink";
import {AssertValidate, GenerateUUID} from "web-vcore/nm/mobx-graphlink";
import {Layer} from "../Store/db/layers/@Layer";

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