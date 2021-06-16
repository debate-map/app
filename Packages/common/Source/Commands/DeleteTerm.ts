import {UserEdit} from "../CommandMacros";
import {Command_Old, GetAsync, Command, AssertV, WrapDBValue} from "web-vcore/nm/mobx-graphlink";
import {Term} from "../Store/firebase/terms/@Term";
import {GetTerm} from "../Store/firebase/terms";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

@UserEdit
export class DeleteTerm extends Command<{termID: string}, {}> {
	oldData: Term;
	Validate() {
		const {termID} = this.payload;
		this.oldData = GetTerm(termID);
		AssertExistsAndUserIsCreatorOrMod(this, this.oldData, "delete");
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