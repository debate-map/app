import {Command, AssertV, AssertValidate, GetSchemaJSON, Schema} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {UserHidden} from "../DB/userHiddens/@UserHidden.js";
import {GetUserHidden} from "../DB/userHiddens.js";

type MainType = UserHidden;
const MTName = "UserHidden";

export class SetUserData_Hidden extends Command<{id: string, updates: Partial<MainType>}, {}> {
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
		this.oldData = GetUserHidden.BIN(id);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {};
		updates[`userHiddens/${id}`] = this.newData;
		return updates;
	}
}