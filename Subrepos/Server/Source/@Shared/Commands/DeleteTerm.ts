import {UserEdit} from "../CommandMacros";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {Term} from "../Store/firebase/terms/@Term";
import {GetTerm} from "../Store/firebase/terms";

@UserEdit
export class DeleteTerm extends Command<{termID: string}, {}> {
	oldData: Term;
	Validate() {
		const {termID} = this.payload;
		this.oldData = GetTerm(termID);
		AssertV(this.oldData, "oldData is null.");
	}

	GetDBUpdates() {
		const {termID} = this.payload;
		const updates = {
			[`terms/${termID}`]: null,
			[`termNames/${this.oldData.name.toLowerCase()}/.${termID}`]: null,
		};
		return updates;
	}
}