import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import TermComponent from "../../Store/firebase/termComponents/@TermComponent";

export default class DeleteTermComponent extends Command<{termComponentID: number}> {
	Validate_Early() {
		let {termComponentID} = this.payload;
		Assert(IsNumber(termComponentID)); 
	}

	oldData: TermComponent;
	async Prepare() {
		let {termComponentID} = this.payload;
		this.oldData = await GetDataAsync(`termComponents/${termComponentID}`, true, false) as TermComponent;
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