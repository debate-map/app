import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {DeepGet} from "../../Frame/V/V";
import {Term} from "../../Store/firebase/terms/@Term";

export default class DeleteTerm extends Command<{termID: number}> {
	async Run() {
		let {termID} = this.payload;
		let firebase = store.firebase.helpers;
		
		// validate call
		// ==========

		// prepare
		// ==========

		let oldData = await GetDataAsync(`terms/${termID}`, true, false) as Term;
		
		// validate state
		// ==========

		// execute
		// ==========

		let updates_db = {
			[`terms/${termID}`]: null,
			[`termNames/${oldData.name}/${termID}`]: null,
		};
		await firebase.Ref().update(updates_db);
	}
}