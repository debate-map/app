import {UserEdit} from "../CommandMacros.js";
import {AssertValidate, GenerateUUID, WrapDBValue} from "web-vcore/nm/mobx-graphlink.js";
import {Command} from "web-vcore/nm/mobx-graphlink.js";
import {Term} from "../Store/db/terms/@Term.js";

@UserEdit
export class AddTerm extends Command<{term: Term}, string> {
	termID: string;
	Validate() {
		const {term} = this.payload;
		this.termID = this.termID ?? GenerateUUID();
		term.creator = this.userInfo.id;
		term.createdAt = Date.now();

		this.returnData = this.termID;
		AssertValidate("Term", term, "Term invalid");
	}

	GetDBUpdates() {
		const {term} = this.payload;
		const updates = {
			// 'general/data/.lastTermID': this.termID,
			[`terms/${this.termID}`]: term,
			//[`termNames/${term.name.toLowerCase()}/.${this.termID}`]: WrapDBValue(true, {merge: true}),
		};
		return updates;
	}
}