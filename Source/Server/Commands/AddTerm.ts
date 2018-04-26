import { UserEdit } from "Server/CommandMacros";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Term } from "../../Store/firebase/terms/@Term";
import { Command } from "../Command";

@UserEdit
export default class AddTerm extends Command<{term: Term}> {
	termID: number;
	async Prepare() {
		let lastTermID = await GetDataAsync("general", "lastTermID") as number;
		this.termID = lastTermID + 1;
		this.payload.term.createdAt = Date.now();
	}
	async Validate() {
		let {term} = this.payload;
		AssertValidate("Term", term, `Term invalid`);
	}
	
	GetDBUpdates() {
		let {term} = this.payload;
		let updates = {
			"general/lastTermID": this.termID,
			[`terms/${this.termID}`]: term,
			[`termNames/${term.name.toLowerCase()}/${this.termID}`]: true,
		};
		return updates;
	}
}