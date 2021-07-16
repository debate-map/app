import {Command, AssertV, AssertValidate, GetSchemaJSON, NewSchema, dbp} from "web-vcore/nm/mobx-graphlink.js";
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
				id: {$ref: "UUID"},
				updates: NewSchema({
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

	DeclareDBUpdates(db) {
		const {id} = this.payload;
		db.set(dbp`userHiddens/${id}`, this.newData);
	}
}