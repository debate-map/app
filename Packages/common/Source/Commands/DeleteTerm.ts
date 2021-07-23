import {GetAsync, Command, AssertV, WrapDBValue, dbp, CommandMeta, DBHelper, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Term} from "../DB/terms/@Term.js";
import {GetTerm} from "../DB/terms.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeleteTerm extends Command<{id: string}, {}> {
	oldData: Term;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetTerm(id)!;
		AssertUserCanDelete(this, this.oldData);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`terms/${id}`, null);
		//db.set(dbp`termNames/${this.oldData.name.toLowerCase()}/.${id}`, WrapDBValue(null, {merge: true}));
	}
}