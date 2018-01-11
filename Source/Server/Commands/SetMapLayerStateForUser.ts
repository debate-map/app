import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ClaimForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {Map_nameFormat, Map} from "../../Store/firebase/maps/@Map";
import {UserEdit} from "../CommandMacros";
import {MapEdit} from "Server/CommandMacros";

AddSchema({
	properties: {
		userID: {type: "string"},
		mapID: {type: "number"},
		layerID: {type: "number"},
		state: {type: ["null", "boolean"]},
	},
	required: ["userID", "mapID", "layerID", "state"],
}, "SetMapLayerStateForUser_payload");

@MapEdit
@UserEdit
export default class SetMapLayerStateForUser extends Command<{userID: string, mapID: number, layerID: number, state: boolean}> {
	Validate_Early() {
		AssertValidate("SetMapLayerStateForUser_payload", this.payload, `Payload invalid`);
	}

	async Prepare() {}
	async Validate() {
		let {userID} = this.payload;
		Assert(userID == this.userInfo.id, "Cannot change this setting for another user!");
	}
	
	GetDBUpdates() {
		let {userID, mapID, layerID, state} = this.payload;
		let updates = {};
		updates[`userMapInfo/${userID}/${mapID}/layerStates/${layerID}`] = state;
		//updates[`layers/${layerID}/usersWhereStateSet/${userID}`] = state;
		return updates;
	}
}