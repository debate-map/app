import {Assert, CE} from "web-vcore/nm/js-vextensions.js";
import {AssertValidate, AddSchema, GetSchemaJSON, NewSchema, WrapDBValue, dbp, GetAsync, Command, AssertV, CommandMeta, DBHelper, DeriveJSONSchema, SimpleSchema, ClassKeys} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Term} from "../DB/terms/@Term.js";
import {GetTerm} from "../DB/terms.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

const MTClass = Term;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {$ref: "UUID"},
		$updates: DeriveJSONSchema(MTClass, {includeOnly: ["accessPolicy", "name", "forms", "disambiguation", "type", "definition", "note"], makeOptional_all: true}),
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