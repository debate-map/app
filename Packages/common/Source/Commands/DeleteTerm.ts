import {GetAsync, Command, AssertV, WrapDBValue, dbp} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Term} from "../DB/terms/@Term.js";
import {GetTerm} from "../DB/terms.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
export class DeleteTerm extends Command<{termID: string}, {}> {
	oldData: Term;
	Validate() {
		const {termID} = this.payload;
		this.oldData = GetTerm(termID)!;
		AssertUserCanDelete(this, this.oldData);
	}

	GetDBUpdates() {
		const {termID} = this.payload;
		const updates = {
			[dbp`terms/${termID}`]: null,
			//[`termNames/${this.oldData.name.toLowerCase()}/.${termID}`]: WrapDBValue(null, {merge: true}),
		};
		return updates;
	}
}