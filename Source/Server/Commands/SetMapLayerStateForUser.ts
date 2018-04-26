import { MapEdit } from "Server/CommandMacros";
import { Assert } from "js-vextensions";
import { Command } from "../Command";
import { UserEdit } from "../CommandMacros";

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