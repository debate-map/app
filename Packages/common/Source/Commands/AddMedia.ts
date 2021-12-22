import {Command, AssertV, dbp, AssertValidate, GenerateUUID, CommandMeta, SimpleSchema, DBHelper} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {HasModPermissions} from "../DB/users/$user.js";
import {Media} from "../DB/media/@Media.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$media: {$ref: "Media"},
	}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddMedia extends Command<{media: Media}, {id: string}> {
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add media currently. (till review/approval system is implemented)");

		const {media} = this.payload;
		media.id = this.GenerateUUID_Once("id");
		media.creator = this.userInfo.id;
		media.createdAt = Date.now();

		this.returnData = {id: media.id};
		AssertValidate("Media", media, "Media invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {media} = this.payload;
		db.set(dbp`medias/${media.id}`, media);
	}
}