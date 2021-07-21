import {Assert, CE} from "web-vcore/nm/js-vextensions.js";
import {AssertValidate, AddSchema, GetSchemaJSON, NewSchema, WrapDBValue, dbp, GetAsync, Command, AssertV, CommandMeta, DBHelper} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Term} from "../DB/terms/@Term.js";
import {GetTerm} from "../DB/terms.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

type MT = Term;
const MTName = "Term";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			id: {$ref: "UUID"},
			updates: NewSchema({
				properties: CE(GetSchemaJSON(MTName).properties!).Including("name", "forms", "disambiguation", "type", "definition", "note"),
			}),
		},
		required: ["id", "updates"],
	}),
})
export class UpdateTerm extends Command<{id: string, updates: Partial<MT>}, {}> {
	oldData: MT;
	newData: MT;
	Validate() {
		const {id, updates} = this.payload;
		this.oldData = GetTerm.NN(id);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, "New-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`terms/${id}`, this.newData);
		/*if (this.newData.name != this.oldData.name) {
			db.set(dbp`termNames/${this.oldData.name.toLowerCase()}/.${id}`, WrapDBValue(null, {merge: true}));
			db.set(dbp`termNames/${this.newData.name.toLowerCase()}/.${id}`, WrapDBValue(true, {merge: true}));
		}*/
	}
}