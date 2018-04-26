import { UserEdit } from "Server/CommandMacros";
import { Assert } from "js-vextensions";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import TermComponent from "../../Store/firebase/termComponents/@TermComponent";
import { Command } from "../Command";

@UserEdit
export default class DeleteTermComponent extends Command<{termComponentID: number}> {
	Validate_Early() {
		let {termComponentID} = this.payload;
		Assert(IsNumber(termComponentID)); 
	}

	oldData: TermComponent;
	async Prepare() {
		let {termComponentID} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "termComponents", termComponentID) as TermComponent;
	}
	async Validate() {
	}
	
	GetDBUpdates() {
		let {termComponentID} = this.payload;
		let updates = {
			[`termComponents/${termComponentID}`]: null,
		};
		// delete as child of parent-terms
		for (let parentTermID in this.oldData.parentTerms) {
			updates[`terms/${parentTermID}/components/${termComponentID}`] = null;
		}
		return updates;
	}
}