import {Command, AssertV, dbp, AssertValidate, GenerateUUID, CommandMeta, SimpleSchema, DBHelper} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {HasModPermissions} from "../DB/users/$user.js";
import {Media} from "../DB/media/@Media.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddMedia extends Command<{media: Media}, {id: string}> {
	mediaID: string;
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add media currently. (till review/approval system is implemented)");

		const {media} = this.payload;
		this.mediaID = this.mediaID ?? GenerateUUID();
		media.creator = this.userInfo.id;
		media.createdAt = Date.now();

		this.returnData = {id: this.mediaID};
		AssertValidate("Media", media, "Media invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {media} = this.payload;
		db.set(dbp`medias/${this.mediaID}`, media);
	}
}