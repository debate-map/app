import { UserEdit } from "Server/CommandMacros";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Image } from "../../Store/firebase/images/@Image";
import { Command } from "../Command";

@UserEdit
export default class AddImage extends Command<{image: Image}> {
	imageID: number;
	async Prepare() {
		let lastImageID = await GetDataAsync("general", "lastImageID") as number;
		this.imageID = lastImageID + 1;
		this.payload.image.createdAt = Date.now();
	}
	async Validate() {
		let {image} = this.payload;
		AssertValidate("Image", image, `Image invalid`);
	}
	
	GetDBUpdates() {
		let {image} = this.payload;
		let updates = {
			"general/lastImageID": this.imageID,
			[`images/${this.imageID}`]: image,
		};
		return updates;
	}
}