import {Command} from "mobx-firelink";
import {GetUser} from "Store/firebase/users";
import {User_Private} from "Store/firebase/users_private/@User_Private";
import {AssertValidate, GetSchemaJSON, Schema} from "vwebapp-framework";
import {GetUser_Private} from "Store/firebase/users_private";

type MainType = User_Private;
const MTName = "User_Private";

export class SetUserData_Private extends Command<{id: string, updates: Partial<MainType>}, {}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		AssertValidate({
			properties: {
				id: {type: "string"},
				updates: Schema({
					properties: GetSchemaJSON(MTName)["properties"].Including(
						"email", "providerData",
						"backgroundID", "backgroundCustom_enabled", "backgroundCustom_color", "backgroundCustom_url", "backgroundCustom_position",
					),
				}),
			},
			required: ["id", "updates"],
		}, this.payload, "Payload invalid");

		const {id, updates} = this.payload;
		this.oldData = GetUser_Private(id);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {};
		updates[`users_private/${id}`] = this.newData;
		return updates;
	}
}