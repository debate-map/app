import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {Image} from "../../Store/firebase/images/@Image";
import {UserEdit} from "Server/CommandMacros";

@UserEdit
export default class AddImage extends Command<{image: Image}> {
	lastImageID_new: number;
	imageID: number;
	async Prepare() {
		this.lastImageID_new = await GetDataAsync("general", "lastImageID") as number;
		this.imageID = ++this.lastImageID_new;
		this.payload.image.createdAt = Date.now();
	}
	async Validate() {
		let {image} = this.payload;
		AssertValidate("Image", image, `Image invalid`);
	}
	
	GetDBUpdates() {
		let {image} = this.payload;
		let updates = {
			"general/lastImageID": this.lastImageID_new,
			[`images/${this.imageID}`]: image,
		};
		return updates;
	}
}