import {AddSchema, AssertValidate, GetSchemaJSON, Schema} from "vwebapp-framework";
import {Command_Old, GetAsync, Command} from "mobx-firelink";
import {GetUser} from "Store/firebase/users";
import {User} from "../../Store/firebase/users/@User";

type MainType = User;
const MTName = "User";

AddSchema(`Update${MTName}_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: GetSchemaJSON(MTName)["properties"].Including(
				"displayName", "backgroundID",
				"backgroundCustom_enabled", "backgroundCustom_color", "backgroundCustom_url", "backgroundCustom_position",
			),
		}),
	},
	required: ["id", "updates"],
}));

export class UpdateProfile extends Command<{id: string, updates: Partial<MainType>}, {}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		AssertValidate(`Update${MTName}_payload`, this.payload, "Payload invalid");

		const {id, updates} = this.payload;
		this.oldData = GetUser(id);
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