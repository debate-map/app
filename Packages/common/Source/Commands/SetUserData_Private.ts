import {Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {AssertValidate, GetSchemaJSON, Schema} from "web-vcore/nm/mobx-graphlink";
import {User_Private} from "../Store/db/users_private/@User_Private";
import {GetUser_Private} from "../Store/db/users_private";
import {CE} from "web-vcore/nm/js-vextensions";

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
					properties: CE(GetSchemaJSON(MTName)["properties"]).Including(
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