import {Assert, CE} from "web-vcore/nm/js-vextensions.js";
import {AssertValidate, AddSchema, GetSchemaJSON, NewSchema, WrapDBValue, dbp, GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Term} from "../DB/terms/@Term.js";
import {GetTerm} from "../DB/terms.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

type MainType = Term;
const MTName = "Term";

AddSchema(`Update${MTName}_payload`, [MTName], ()=>({
	properties: {
		id: {$ref: "UUID"},
		updates: NewSchema({
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
		this.oldData = GetTerm.NN(termID);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate("Term", this.newData, "New-data invalid");
	}

	DeclareDBUpdates(db) {
		const {termID} = this.payload;
		db.set(dbp`terms/${termID}`, this.newData);
		/*if (this.newData.name != this.oldData.name) {
			db.set(`termNames/${this.oldData.name.toLowerCase()}/.${termID}`, WrapDBValue(null, {merge: true}));
			db.set(`termNames/${this.newData.name.toLowerCase()}/.${termID}`, WrapDBValue(true, {merge: true}));
		}*/
	}
}