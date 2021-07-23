import {GetAsync, Command, AssertV, dbp, CommandMeta, DBHelper, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Media} from "../DB/media/@Media.js";
import {GetMedia, IsUserCreatorOrMod, GetShare, Share} from "../DB.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeleteShare extends Command<{id: string}, {}> {
	oldData: Share;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetShare.NN(id);
		AssertUserCanDelete(this, this.oldData);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`shares/${id}`, null);
	}
}