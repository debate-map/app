import {Assert, CE} from "js-vextensions";
import {UserEdit} from "../CommandMacros";
import {AssertValidate, AddSchema, GetSchemaJSON, Schema, WrapDBValue} from "mobx-firelink";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {Term} from "../Store/firebase/terms/@Term";
import {GetTerm} from "../Store/firebase/terms";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

type MainType = Term;
const MTName = "Term";

AddSchema(`Update${MTName}_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: CE(GetSchemaJSON(MTName).properties).Including("name", "forms", "disambiguation", "type", "definition", "note"),
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
		AssertExistsAndUserIsCreatorOrMod(this, this.oldData, "update");
		this.newData = {...this.oldData, ...updates};
		AssertValidate("Term", this.newData, "New-data invalid");
	}

	GetDBUpdates() {
		const {termID} = this.payload;

		const updates = {
			[`terms/${termID}`]: this.newData,
		} as any;
		/*if (this.newData.name != this.oldData.name) {
			updates[`termNames/${this.oldData.name.toLowerCase()}/.${termID}`] = WrapDBValue(null, {merge: true});
			updates[`termNames/${this.newData.name.toLowerCase()}/.${termID}`] = WrapDBValue(true, {merge: true});
		}*/
		return updates;
	}
}