import {GetAsync, Command, AssertV, dbp, CommandMeta, DBHelper, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Media} from "../DB/media/@Media.js";
import {GetMedia, IsUserCreatorOrMod} from "../DB.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

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
		AssertUserCanDelete(this, this.oldData);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`medias/${id}`, null);
	}
}