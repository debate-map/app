import {Assert} from "web-vcore/nm/js-vextensions";
import {MapEdit} from "../CommandMacros";
import {AddSchema, AssertValidate} from "web-vcore/nm/mobx-graphlink";
import {Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";

AddSchema("SetMapLayerStateForUser_payload", {
	properties: {
		userID: {type: "string"},
		mapID: {type: "string"},
		layerID: {type: "string"},
		state: {type: ["null", "boolean"]},
	},
	required: ["userID", "mapID", "layerID", "state"],
});

@MapEdit
@UserEdit
export class SetMapLayerStateForUser extends Command<{userID: string, mapID: string, layerID: string, state: boolean}, {}> {
	Validate() {
		AssertValidate("SetMapLayerStateForUser_payload", this.payload, "Payload invalid");
		const {userID} = this.payload;
		AssertV(userID == this.userInfo.id, "Cannot change this setting for another user!");
	}

	GetDBUpdates() {
		const {userID, mapID, layerID, state} = this.payload;
		const updates = {};
		updates[`userMapInfo/${userID}/.${mapID}/.layerStates/.${layerID}`] = state;
		// updates[`layers/${layerID}/usersWhereStateSet/${userID}`] = state;
		return updates;
	}
}