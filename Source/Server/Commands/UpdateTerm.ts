import {Assert} from "js-vextensions";
import {UserEdit} from "Server/CommandMacros";
import {AssertValidate, AddSchema, GetSchemaJSON, Schema} from "vwebapp-framework";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetTerm} from "Store/firebase/terms";
import {Term} from "../../Store/firebase/terms/@Term";

type MainType = Term;
const MTName = "Term";

AddSchema(`Update${MTName}_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: GetSchemaJSON(MTName)["properties"].Including("name", "disambiguation", "type", "person", "definition", "note"),
		}),
	},
	required: ["id", "updates"],
}));

@UserEdit
export class UpdateTerm extends Command<{termID: string, updates: Partial<Term>}, {}> {
	oldData: Term;
	newData: Term;
	Validate() {
		const {termID, updates} = this.payload;
		this.oldData = GetTerm(termID);
		AssertV(this.oldData, "oldData is null.");
		this.newData = {...this.oldData, ...updates};
		AssertValidate("Term", this.newData, "New-data invalid");
	}

	GetDBUpdates() {
		const {termID} = this.payload;

		const updates = {
			[`terms/${termID}`]: this.newData,
		} as any;
		if (this.newData.name != this.oldData.name) {
			updates[`termNames/${this.oldData.name.toLowerCase()}/.${termID}`] = null;
			updates[`termNames/${this.newData.name.toLowerCase()}/.${termID}`] = true;
		}
		return updates;
	}
}