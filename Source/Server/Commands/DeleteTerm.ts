import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";

export default class DeleteTerm extends Command<{termID: number}> {
	oldData: Term;
	async Prepare() {
		let {termID} = this.payload;
		this.oldData = await GetDataAsync(`terms/${termID}`, true, false) as Term;
	}
	async Validate() {
	}
	
	GetDBUpdates() {
		let {termID} = this.payload;
		let updates = {
			[`terms/${termID}`]: null,
			[`termNames/${this.oldData.name.toLowerCase()}/${termID}`]: null,
		};
		return updates;
	}
}