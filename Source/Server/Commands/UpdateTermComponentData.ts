import {UserEdit} from "Server/CommandMacros";
import {Assert} from "js-vextensions";
import {AssertValidate, AddSchema, Schema, GetSchemaJSON} from "vwebapp-framework";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetTermComponent} from "Store/firebase/termComponents";
import {TermComponent} from "../../Store/firebase/termComponents/@TermComponent";

type MainType = TermComponent;
const MTName = "TermComponent";

AddSchema(`Update${MTName}_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: GetSchemaJSON(MTName)["properties"].Including("text"),
		}),
	},
	required: ["id", "updates"],
}));

@UserEdit
export class UpdateTermComponentData extends Command<{termComponentID: string, updates: Partial<TermComponent>}, {}> {
	newData: TermComponent;
	Validate() {
		AssertValidate(`Update${MTName}_payload`, this.payload, "Payload invalid");

		const {termComponentID, updates} = this.payload;
		const oldData = GetTermComponent(termComponentID);
		AssertV(oldData, "oldData is null.");
		this.newData = {...oldData, ...updates};
		AssertValidate("TermComponent", this.newData, "New-data invalid");
	}

	GetDBUpdates() {
		const {termComponentID} = this.payload;
		const updates = {
			[`termComponents/${termComponentID}`]: this.newData,
		};
		return updates;
	}
}