import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ClaimForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "js-vextensions";
import {Term} from "../../Store/firebase/terms/@Term";
import {UserEdit} from "Server/CommandMacros";

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