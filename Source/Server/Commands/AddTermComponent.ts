import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import TermComponent from "../../Store/firebase/termComponents/@TermComponent";

export default class AddTermComponent extends Command<{termID: number, termComponent: TermComponent}> {
	async Run() {
		let {termID, termComponent} = this.payload;
		let firebase = store.firebase.helpers;

		let lastTermComponentID_new = await GetDataAsync(`general/lastTermComponentID`) as number;
		let termComponentID = ++lastTermComponentID_new;

		// validate call
		// ==========

		//Assert(termComponent.termParents && termComponent.termParents.VKeys().length == 1, `Term-component must have exactly one term-parent`);

		// prepare
		// ==========

		termComponent.parentTerms = {[termID]: true};
		
		// validate state
		// ==========

		if (!ajv.validate(`TermComponent`, termComponent)) throw new Error(`Term-component invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(termComponent, null, 3)}\n`);

		// execute
		// ==========

		let updates = {
			"general/lastTermComponentID": lastTermComponentID_new,
			[`terms/${termID}/components/${termComponentID}`]: true,
			[`termComponents/${termComponentID}`]: termComponent,
		};
		await firebase.Ref().update(updates);
	}
}