import {UserEdit} from "Server/CommandMacros";
import {Command_Old, Command, AssertV} from "mobx-firelink";
import {AssertValidate, GenerateUUID} from "vwebapp-framework";
import {HasModPermissions} from "Store/firebase/users/$user";
import {Image} from "../../Store/firebase/images/@Image";

@UserEdit
export class AddImage extends Command<{image: Image}, string> {
	imageID: string;
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add images currently. (till review/approval system is implemented)");

		const {image} = this.payload;
		this.imageID = this.imageID ?? GenerateUUID();
		image.creator = this.userInfo.id;
		image.createdAt = Date.now();

		this.returnData = this.imageID;
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