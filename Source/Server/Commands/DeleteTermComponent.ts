import {UserEdit} from "Server/CommandMacros";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetTermComponent} from "Store/firebase/termComponents";
import {TermComponent} from "../../Store/firebase/termComponents/@TermComponent";

@UserEdit
export class DeleteTermComponent extends Command<{termComponentID: string}, {}> {
	oldData: TermComponent;
	Validate() {
		const {termComponentID} = this.payload;
		this.oldData = GetTermComponent(termComponentID);
		AssertV(this.oldData, "oldData is null.");
	}

	GetDBUpdates() {
		const {termComponentID} = this.payload;
		const updates = {
			[`termComponents/${termComponentID}`]: null,
		};
		// delete as child of parent-terms
		for (const parentTermID of this.oldData.parentTerms.VKeys(true)) {
			updates[`terms/${parentTermID}/.components/.${termComponentID}`] = null;
		}
		return updates;
	}
}