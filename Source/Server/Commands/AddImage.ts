import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ClaimForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "js-vextensions";
import {Term} from "../../Store/firebase/terms/@Term";
import {Image} from "../../Store/firebase/images/@Image";
import {UserEdit} from "Server/CommandMacros";

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