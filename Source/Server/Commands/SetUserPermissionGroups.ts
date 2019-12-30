import {PermissionGroupSet} from "Store/firebase/userExtras/@UserExtraInfo";
import {AddSchema, AssertValidate} from "vwebapp-framework";
import {Command} from "mobx-firelink";
import {UserEdit} from "../CommandMacros";

@UserEdit
export class SetUserPermissionGroups extends Command<{userID: string, permissionGroups: PermissionGroupSet}, {}> {
	Validate() {
		AssertValidate({
			properties: {
				userID: {type: "string"},
				permissionGroups: {$ref: "PermissionGroupSet"},
			},
			required: ["userID", "permissionGroups"],
		}, this.payload, "Payload invalid");
	}

	GetDBUpdates() {
		const {userID, permissionGroups} = this.payload;
		const updates = {};
		updates[`userExtras/${userID}/.permissionGroups`] = permissionGroups;
		return updates;
	}
}