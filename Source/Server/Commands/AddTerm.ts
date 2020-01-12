import {UserEdit} from "Server/CommandMacros";
import {AssertValidate, GenerateUUID} from "vwebapp-framework";
import {Command_Old, Command} from "mobx-firelink";
import {Term} from "../../Store/firebase/terms/@Term";

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
			[`termNames/${term.name.toLowerCase()}/.${this.termID}`]: true,
		};
		return updates;
	}
}