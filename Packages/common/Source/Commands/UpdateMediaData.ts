import {CE} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, AssertV, AssertValidate, Command, GetSchemaJSON, Schema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Media} from "../DB/media/@Media.js";
import {GetMedia} from "../DB.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

type MainType = Media;
const MTName = "Media";

AddSchema(`Update${MTName}Data_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: CE(GetSchemaJSON(MTName).properties).Including("name", "type", "url", "description"),
		}),
	},
	required: ["id", "updates"],
}));

@UserEdit
export class UpdateMediaData extends Command<{id: string, updates: Partial<Media>}, {}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		AssertValidate(`Update${MTName}Data_payload`, this.payload, "Payload invalid");

		const {id, updates} = this.payload;
		this.oldData = GetMedia(id);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, "New-data invalid");
	}

	GetDBUpdates() {
		const {id} = this.payload;

		const updates = {
			[`medias/${id}`]: this.newData,
		} as any;
		return updates;
	}
}