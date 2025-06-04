import {Command, CommandMeta, DBHelper, dbp, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetTerm} from "../DB/terms.js";
import {Term} from "../DB/terms/@Term.js";
import {PERMISSIONS} from "../DB.js";

@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeleteTerm extends Command<{id: string}, {}> {
	oldData: Term;
	Validate() {
		const {id} = this.input;
		this.oldData = GetTerm(id)!;
		AssertV(PERMISSIONS.Term.Delete(this.userInfo.id, this.oldData));
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.input;
		db.set(dbp`terms/${id}`, null);
		//db.set(dbp`termNames/${this.oldData.name.toLowerCase()}/.${id}`, WrapDBValue(null, {merge: true}));
	}
}