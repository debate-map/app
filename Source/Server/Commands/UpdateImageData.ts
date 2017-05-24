import {Image} from "../../Store/firebase/images/@Image";
import {Command} from "../Command";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";

export default class UpdateImageData extends Command<{id: number, updates: Partial<Image>}> {
	Validate_Early() {
		let {id, updates} = this.payload;
		let allowedPropUpdates = ["name", "type", "description"];
		Assert(updates.VKeys().Except(...allowedPropUpdates).length == 0, `Cannot use this command to update props other than: ${allowedPropUpdates.join(", ")}`);
	}

	oldData: Image;
	newData: Image;
	async Prepare() {
		let {id, updates} = this.payload;
		this.oldData = await GetDataAsync(`images/${id}`, true, false) as Image;
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