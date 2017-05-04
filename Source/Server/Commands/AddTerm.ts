import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";

export default class AddTerm extends Command<{term: Term}> {
	async Run() {
		let {term} = this.payload;
		let firebase = store.firebase.helpers;

		let lastTermID_new = await GetDataAsync(`general/lastTermID`) as number;
		let termID = ++lastTermID_new;

		// validate call
		// ==========

		// prepare
		// ==========
		
		// validate state
		// ==========

		if (!ajv.validate(`Term`, term)) throw new Error(`Term invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(term, null, 3)}\n`);

		// execute
		// ==========

		let updates = {
			"general/lastTermID": lastTermID_new,
			[`terms/${termID}`]: term,
			[`termNames/${term.name}/${termID}`]: true,
		};
		await firebase.Ref().update(updates);
	}
}