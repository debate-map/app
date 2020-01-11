import {UserEdit} from "Server/CommandMacros";
import {GenerateUUID} from "Utils/General/KeyGenerator";
import {Command_Old, Command, AssertV} from "mobx-firelink";
import {AssertValidate} from "vwebapp-framework";
import {HasModPermissions} from "Store/firebase/users/$user";
import {Image} from "../../Store/firebase/images/@Image";

@UserEdit
export class AddImage extends Command<{image: Image}, {}> {
	imageID: string;
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add images currently. (till review/approval system is implemented)");

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