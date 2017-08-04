import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {UserEdit} from "Server/CommandMacros";

@UserEdit
export default class UpdateTermData extends Command<{termID: number, updates: Partial<Term>}> {
	Validate_Early() {
		let {termID, updates} = this.payload;
		let allowedPropUpdates = ["name", "disambiguation", "type", "person", "shortDescription_current"];
		Assert(updates.VKeys().Except(...allowedPropUpdates).length == 0, `Cannot use this command to update props other than: ${allowedPropUpdates.join(", ")}`);
	}

	oldData: Term;
	newData: Term;
	async Prepare() {
		let {termID, updates} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "terms", termID) as Term;
		this.newData = {...this.oldData, ...updates};
	}
	async Validate() {
		AssertValidate("Term", this.newData, `New-data invalid`);
	}
	
	GetDBUpdates() {
		let {termID} = this.payload;
		
		let updates = {
			[`terms/${termID}`]: this.newData,
		} as any;
		if (this.newData.name != this.oldData.name) {
			updates[`termNames/${this.oldData.name.toLowerCase()}/${termID}`] = null; 
			updates[`termNames/${this.newData.name.toLowerCase()}/${termID}`] = true; 
		}
		return updates;
	}
}