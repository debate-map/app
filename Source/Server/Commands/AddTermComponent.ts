import { UserEdit } from "Server/CommandMacros";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import TermComponent from "../../Store/firebase/termComponents/@TermComponent";
import { Command } from "../Command";

@UserEdit
export default class AddTermComponent extends Command<{termID: number, termComponent: TermComponent}> {
	/*Validate_Early() {
		//Assert(termComponent.termParents && termComponent.termParents.VKeys().length == 1, `Term-component must have exactly one term-parent`);
	}*/

	termComponentID: number;
	async Prepare() {
		let {termID, termComponent} = this.payload;
		let firebase = store.firebase.helpers;

		let lastTermComponentID = await GetDataAsync("general", "lastTermComponentID") as number;
		this.termComponentID = lastTermComponentID + 1;

		termComponent.parentTerms = {[termID]: true};
	}
	async Validate() {
		let {termID, termComponent} = this.payload;
		AssertValidate("TermComponent", termComponent, `Term-component invalid`);
	}
	
	GetDBUpdates() {
		let {termID, termComponent} = this.payload;
		let updates = {
			"general/lastTermComponentID": this.termComponentID,
			[`terms/${termID}/components/${this.termComponentID}`]: true,
			[`termComponents/${this.termComponentID}`]: termComponent,
		};
		return updates;
	}
}