import {UserEdit} from "Server/CommandMacros";
import {GenerateUUID} from "Utils/General/KeyGenerator";
import {Command_Old, Command} from "mobx-firelink";
import {AssertValidate} from "vwebapp-framework";
import {Image} from "../../Store/firebase/images/@Image";

@UserEdit
export class AddImage extends Command<{image: Image}, {}> {
	imageID: string;
	Validate() {
		const {image} = this.payload;
		this.imageID = this.imageID ?? GenerateUUID();
		image.createdAt = Date.now();
		AssertValidate("Image", image, "Image invalid");
	}

	GetDBUpdates() {
		const {image} = this.payload;
		const updates = {
			// 'general/data/.lastImageID': this.imageID,
			[`images/${this.imageID}`]: image,
		};
		return updates;
	}
}