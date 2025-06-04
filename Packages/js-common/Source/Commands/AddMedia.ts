import {Command, AssertV, dbp, AssertValidate, GenerateUUID, CommandMeta, SimpleSchema, DBHelper} from "mobx-graphlink";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {HasModPermissions} from "../DB/users/$user.js";
import {Media} from "../DB/media/@Media.js";

@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
		$media: {$ref: "Media"},
	}),
	responseSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddMedia extends Command<{media: Media}, {id: string}> {
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add media currently. (till review/approval system is implemented)");

		const {media} = this.input;
		media.id = this.GenerateUUID_Once("id");
		media.creator = this.userInfo.id;
		media.createdAt = Date.now();

		this.response = {id: media.id};
		AssertValidate("Media", media, "Media invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {media} = this.input;
		db.set(dbp`medias/${media.id}`, media);
	}
}