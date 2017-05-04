import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {DeepGet} from "../../Frame/V/V";
import {Term} from "../../Store/firebase/terms/@Term";
import TermComponent from "../../Store/firebase/termComponents/@TermComponent";

export default class UpdateTermComponentData extends Command<{termComponentID: number, updates: Partial<TermComponent>}> {
	async Run() {
		let {termComponentID, updates} = this.payload;
		let firebase = store.firebase.helpers;
		
		// validate call
		// ==========

		let allowedPropUpdates = ["text"];
		Assert(updates.VKeys().Except(...allowedPropUpdates).length == 0, `Cannot use this command to update props other than: ${allowedPropUpdates.join(", ")}`);

		// prepare
		// ==========
		
		let oldData = await GetDataAsync(`termComponents/${termComponentID}`, true, false);
		let newData = {...oldData, ...updates};
		
		// validate state
		// ==========

		Assert(ajv.validate(`TermComponent`, newData), `New-data invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(newData, null, 3)}\n`);

		// execute
		// ==========

		let updates_db = {
			[`termComponents/${termComponentID}`]: newData,
		};
		await firebase.Ref().update(updates_db);
	}
}