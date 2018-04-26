import { UserEdit } from "Server/CommandMacros";
import { Assert } from "js-vextensions";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Image } from "../../Store/firebase/images/@Image";
import { Command } from "../Command";

export const UpdateImageData_allowedPropUpdates = ["name", "type", "url", "description", "previewWidth", "sourceChains"];
@UserEdit
export default class UpdateImageData extends Command<{id: number, updates: Partial<Image>}> {
	Validate_Early() {
		let {id, updates} = this.payload;
		Assert(updates.VKeys().Except(...UpdateImageData_allowedPropUpdates).length == 0,
			`Cannot use this command to update props other than: ${UpdateImageData_allowedPropUpdates.join(", ")}`);
	}

	oldData: Image;
	newData: Image;
	async Prepare() {
		let {id, updates} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "images", id) as Image;
		this.newData = {...this.oldData, ...updates};
	}
	async Validate() {
		AssertValidate("Image", this.newData, `New-data invalid`);
	}
	
	GetDBUpdates() {
		let {id} = this.payload;
		
		let updates = {
			[`images/${id}`]: this.newData,
		} as any;
		return updates;
	}
}