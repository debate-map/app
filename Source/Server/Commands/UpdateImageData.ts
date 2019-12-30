import {Assert} from "js-vextensions";
import {Command_Old, GetAsync, AssertV, Command} from "mobx-firelink";
import {UserEdit} from "Server/CommandMacros";
import {GetImage} from "Store/firebase/images";
import {AssertValidate, AddSchema, Schema, GetSchemaJSON} from "vwebapp-framework";
import {Image} from "../../Store/firebase/images/@Image";


type MainType = Image;
const MTName = "Image";

AddSchema(`Update${MTName}Details_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: GetSchemaJSON(MTName).properties.Including("name", "type", "url", "description", "previewWidth", "sourceChains"),
		}),
	},
	required: ["id", "updates"],
}));

@UserEdit
export class UpdateImageData extends Command<{id: string, updates: Partial<Image>}, {}> {
	oldData: Image;
	newData: Image;
	Validate() {
		AssertValidate(`Update${MTName}Details_payload`, this.payload, "Payload invalid");

		const {id, updates} = this.payload;
		this.oldData = GetImage(id);
		AssertV(this.oldData, "oldData is null.");
		this.newData = {...this.oldData, ...updates};
		AssertValidate("Image", this.newData, "New-data invalid");
	}

	GetDBUpdates() {
		const {id} = this.payload;

		const updates = {
			[`images/${id}`]: this.newData,
		} as any;
		return updates;
	}
}