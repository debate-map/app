import {AssertValidate, Command, CommandMeta, DBHelper, dbp, GenerateUUID, SimpleSchema} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {Term} from "../DB/terms/@Term.js";

@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({$term: {$ref: "Term"}}),
	responseSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddTerm extends Command<{term: Term}, {id: string}> {
	setByParent: {id: string};

	Validate() {
		const {term} = this.input;
		term.id = this.setByParent?.id ?? GenerateUUID();
		term.creator = this.userInfo.id;
		term.createdAt = Date.now();

		this.response = {id: term.id};
		AssertValidate("Term", term, "Term invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {term} = this.input;
		db.set(dbp`terms/${term.id}`, term);
		//db.set(dbp`termNames/${term.name.toLowerCase()}/.${this.termID}`, WrapDBValue(true, {merge: true}));
	}
}