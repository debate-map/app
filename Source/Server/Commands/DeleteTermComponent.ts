import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {DeepGet} from "../../Frame/V/V";
import {Term} from "../../Store/firebase/terms/@Term";
import TermComponent from "../../Store/firebase/termComponents/@TermComponent";

export default class DeleteTermComponent extends Command<{termComponentID: number}> {
	async Run() {
		let {termComponentID} = this.payload;
		let firebase = store.firebase.helpers;
		
		// validate call
		// ==========

		Assert(IsNumber(termComponentID)); 

		// prepare
		// ==========
		
		let oldData = await GetDataAsync(`termComponents/${termComponentID}`, true, false) as TermComponent;
		//let newData = {...oldData, ...updates};

		// validate state
		// ==========

		// execute
		// ==========

		let dbUpdates = {
			[`termComponents/${termComponentID}`]: null,
		};
		// delete as child of parent-terms
		for (let parentTermID in oldData.parentTerms) {
			dbUpdates[`terms/${parentTermID}/components/${termComponentID}`] = null;
		}
		await firebase.Ref().update(dbUpdates);
	}
}