import {AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, SimpleSchema} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetTerm} from "../DB/terms.js";
import {Term} from "../DB/terms/@Term.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

const MTClass = Term;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {$ref: "UUID"},
		$updates: DeriveJSONSchema(MTClass, {includeOnly: ["accessPolicy", "name", "forms", "disambiguation", "type", "definition", "note", "attachments"], makeOptional_all: true}),
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