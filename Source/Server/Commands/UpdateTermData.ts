import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {DeepGet} from "../../Frame/V/V";
import {Term} from "../../Store/firebase/terms/@Term";

export default class UpdateTermData extends Command<{termID: number, updates: Partial<Term>}> {
	async Run() {
		let {termID, updates} = this.payload;
		let firebase = store.firebase.helpers;
		
		// validate call
		// ==========

		let allowedPropUpdates = ["name", "type", "person", "shortDescription_current"];
		Assert(updates.VKeys().Except(...allowedPropUpdates).length == 0, `Cannot use this command to update props other than: ${allowedPropUpdates.join(", ")}`);

		// prepare
		// ==========
		
		let oldData = await GetDataAsync(`terms/${termID}`, true, false) as Term;
		let newData = {...oldData, ...updates};
		
		// validate state
		// ==========

		Assert(ajv.validate(`Term`, newData), `New-data invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(newData, null, 3)}\n`);

		// execute
		// ==========

		let dbUpdates = {
			[`terms/${termID}`]: newData,
		} as any;
		if (newData.name != oldData.name) {
			dbUpdates[`termNames/${oldData.name}/${termID}`] = null; 
			dbUpdates[`termNames/${newData.name}/${termID}`] = true; 
		}
		await firebase.Ref().update(dbUpdates);
	}
}