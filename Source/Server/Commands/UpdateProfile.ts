import { WaitTillSchemaAddedThenRun } from "Server/Server";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { User } from "../../Store/firebase/users/@User";
import { Command } from "../Command";
import { GetSchemaJSON } from "../Server";

type MainType = User;
let MTName = "User";

WaitTillSchemaAddedThenRun(MTName, ()=> {
	AddSchema({
		properties: {
			id: {type: "string"},
			updates: Schema({
				properties: GetSchemaJSON(MTName).properties.Including("displayName", "backgroundID", "backgroundCustom_enabled", "backgroundCustom_url", "backgroundCustom_position"),
			}),
		},
		required: ["id", "updates"],
	}, `Update${MTName}_payload`);
});

export class UpdateProfile extends Command<{id: string, updates: Partial<MainType>}> {
	Validate_Early() {
		AssertValidate(`Update${MTName}_payload`, this.payload, `Payload invalid`);
	}

	oldData: MainType;
	newData: MainType;
	async Prepare() {
		let {id, updates} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "users", id) as MainType;
		this.newData = {...this.oldData, ...updates};
	}
	async Validate() {
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}
	
	GetDBUpdates() {
		let {id} = this.payload;
		let updates = {};
		updates[`users/${id}`] = this.newData;
		return updates;
	}
}