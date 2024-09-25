import {Command, CommandMeta, DBHelper, dbp, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetMedia, PERMISSIONS} from "../DB.js";
import {Media} from "../DB/media/@Media.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeleteMedia extends Command<{id: string}, {}> {
	oldData: Media|n;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetMedia(id);
		AssertV(PERMISSIONS.Media.Delete(this.userInfo.id, this.oldData));
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`medias/${id}`, null);
	}
}