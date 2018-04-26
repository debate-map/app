import { UserEdit } from "Server/CommandMacros";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Image } from "../../Store/firebase/images/@Image";
import { Command } from "../Command";

@UserEdit
export default class DeleteImage extends Command<{id: number}> {
	oldData: Image;
	async Prepare() {
		let {id} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "images", id) as Image;
	}
	async Validate() {
	}
	
	GetDBUpdates() {
		let {id} = this.payload;
		let updates = {
			[`images/${id}`]: null,
		};
		return updates;
	}
}