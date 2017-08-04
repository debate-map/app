import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import TermComponent from "../../Store/firebase/termComponents/@TermComponent";
import {UserEdit} from "Server/CommandMacros";

@UserEdit
export default class UpdateTermComponentData extends Command<{termComponentID: number, updates: Partial<TermComponent>}> {
	Validate_Early() {
		let {termComponentID, updates} = this.payload;
		let allowedPropUpdates = ["text"];
		Assert(updates.VKeys().Except(...allowedPropUpdates).length == 0, `Cannot use this command to update props other than: ${allowedPropUpdates.join(", ")}`);
	}

	newData: TermComponent;
	async Prepare() {
		let {termComponentID, updates} = this.payload;
		let oldData = await GetDataAsync({addHelpers: false}, "termComponents", termComponentID) as TermComponent;
		this.newData = {...oldData, ...updates};
	}
	async Validate() {
		AssertValidate("TermComponent", this.newData, `New-data invalid`);
	}
	
	GetDBUpdates() {
		let {termComponentID} = this.payload;
		let updates = {
			[`termComponents/${termComponentID}`]: this.newData,
		};
		return updates;
	}
}