import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {DeepGet} from "../../Frame/V/V";

export default class UpdateNodeDetails extends Command<{nodeID: number, updates: Partial<MapNode>}> {
	async Run() {
		let {nodeID, updates} = this.payload;
		let firebase = store.firebase.helpers;
		
		// validate call
		// ==========

		let allowedPropUpdates = ["relative", "titles", "contentNode"];
		Assert(updates.VKeys().Except(...allowedPropUpdates).length == 0, `Cannot use this command to update props other than: ${allowedPropUpdates.join(", ")}`);
		/*for (let source of DeepGet(updates, "quote.sources", {} as SourceSet).VValues<Source>()) {
			AssertSimple(ajv.validate({format: "uri"}, source.link), `Link uri (${source.link}) is not valid. (make sure you include the "http://" and such)`);
		}*/

		// prepare
		// ==========
		
		let oldData = await GetDataAsync(`nodes/${nodeID}`, true, false);
		let newData = {...oldData, ...updates};
		
		// validate state
		// ==========

		//if (!ajv.validate(`MapNode`, newData)) throw new Error(`New-data invalid: ${ajv.FullErrorsText()}`);
		Assert(ajv.validate(`MapNode`, newData), `New-data invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(newData, null, 3)}\n`);

		// execute
		// ==========

		let updates_db = {
			[`nodes/${nodeID}`]: newData,
		};
		await firebase.Ref().update(updates_db);
	}
}