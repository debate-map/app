import {AddSchema, AssertValidate, GetSchemaJSON, Schema} from "web-vcore/nm/mobx-graphlink";
import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {GetUser} from "../Store/db/users";
import {User} from "../Store/db/users/@User";
import {CE} from "web-vcore/nm/js-vextensions";

type MainType = User;
const MTName = "User";

//export class SetUserData extends Command<{id: string, updates: Partial<MainType>, allowPrevious?: boolean}, {}> {
export class SetUserData extends Command<{id: string, updates: Partial<MainType>}, {}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		AssertValidate({
			properties: {
				id: {type: "string"},
				updates: Schema({
					properties: CE(GetSchemaJSON(MTName)["properties"]).Including(
						"displayName", "photoURL",
						"joinDate", "permissionGroups",
					),
				}),
			},
			required: ["id", "updates"],
		}, this.payload, "Payload invalid");

		const {id, updates} = this.payload;
		//AssertV(id == this.userInfo.id, "Cannot set user-data for another user!");
		this.oldData = GetUser(id);
		/*if (!allowPrevious) {
			AssertV(this.oldData == null, "oldData must be null, since allowPrevious is false.");
		}*/

		// if joinDate is already set, don't allow it to be set again (defensive programming, for if UserSignUpHelper just fails to load existing data fsr)
		if (this.oldData?.joinDate != null) {
			AssertV(!("joinDate" in updates), "joinDate cannot be set after its initial set!");
		}

		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {};
		updates[`users/${id}`] = this.newData;
		return updates;
	}
}