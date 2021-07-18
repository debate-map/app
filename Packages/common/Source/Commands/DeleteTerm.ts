import {GetAsync, Command, AssertV, WrapDBValue, dbp, CommandMeta} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Term} from "../DB/terms/@Term.js";
import {GetTerm} from "../DB/terms.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({}),
})
export class DeleteTerm extends Command<{termID: string}, {}> {
	oldData: Term;
	Validate() {
		const {termID} = this.payload;
		this.oldData = GetTerm(termID)!;
		AssertUserCanDelete(this, this.oldData);
	}

	DeclareDBUpdates(db) {
		const {termID} = this.payload;
		db.set(dbp`terms/${termID}`, null);
		//db.set(`termNames/${this.oldData.name.toLowerCase()}/.${termID}`, WrapDBValue(null, {merge: true}));
	}
}