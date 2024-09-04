import {Command, CommandMeta, DBHelper, dbp, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetShare, PERMISSIONS, Share} from "../DB.js";

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
		AssertV(PERMISSIONS.Share.Delete(this.userInfo.id, this.oldData));
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`shares/${id}`, null);
	}
}