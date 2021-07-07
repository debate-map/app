import {Command, AssertV, dbp, AssertValidate, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";

import {UserEdit} from "../CommandMacros.js";
import {HasModPermissions} from "../DB/users/$user.js";
import {Media} from "../DB/media/@Media.js";

@UserEdit
export class AddMedia extends Command<{media: Media}, string> {
	mediaID: string;
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add media currently. (till review/approval system is implemented)");

		const {media} = this.payload;
		this.mediaID = this.mediaID ?? GenerateUUID();
		media.creator = this.userInfo.id;
		media.createdAt = Date.now();

		this.returnData = this.mediaID;
		AssertValidate("Media", media, "Media invalid");
	}

	GetDBUpdates() {
		const {media} = this.payload;
		const updates = {
			[dbp`medias/${this.mediaID}`]: media,
		};
		return updates;
	}
}