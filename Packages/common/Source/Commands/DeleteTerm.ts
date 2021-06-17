import {UserEdit} from "../CommandMacros";
import {GetAsync, Command, AssertV, WrapDBValue} from "web-vcore/nm/mobx-graphlink";
import {Term} from "../Store/db/terms/@Term";
import {GetTerm} from "../Store/db/terms";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts";

@UserEdit
export class DeleteTerm extends Command<{termID: string}, {}> {
	oldData: Term;
	Validate() {
		const {termID} = this.payload;
		this.oldData = GetTerm(termID);
		AssertUserCanDelete(this, this.oldData);
	}

	GetDBUpdates() {
		const {termID} = this.payload;
		const updates = {
			[`terms/${termID}`]: null,
			//[`termNames/${this.oldData.name.toLowerCase()}/.${termID}`]: WrapDBValue(null, {merge: true}),
		};
		return updates;
	}
}