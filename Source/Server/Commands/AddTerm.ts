import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";

export default class AddTerm extends Command<{term: Term}> {
	lastTermID_new: number;
	termID: number;
	async Prepare() {
		this.lastTermID_new = await GetDataAsync(`general/lastTermID`) as number;
		this.termID = ++this.lastTermID_new;
	}
	async Validate() {
		let {term} = this.payload;
		AssertValidate("Term", term, `Term invalid`);
	}
	
	GetDBUpdates() {
		let {term} = this.payload;
		let updates = {
			"general/lastTermID": this.lastTermID_new,
			[`terms/${this.termID}`]: term,
			[`termNames/${term.name.toLowerCase()}/${this.termID}`]: true,
		};
		return updates;
	}
}