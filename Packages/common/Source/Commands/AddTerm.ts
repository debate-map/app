import {AssertValidate, dbp, GenerateUUID, WrapDBValue, Command, CommandMeta, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";

import {UserEdit} from "../CommandMacros.js";
import {Term} from "../DB/terms/@Term.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddTerm extends Command<{term: Term}, {id: string}> {
	termID: string;
	Validate() {
		const {term} = this.payload;
		this.termID = this.termID ?? GenerateUUID();
		term.creator = this.userInfo.id;
		term.createdAt = Date.now();

		this.returnData = {id: this.termID};
		AssertValidate("Term", term, "Term invalid");
	}

	DeclareDBUpdates(db) {
		const {term} = this.payload;
		db.set(dbp`terms/${this.termID}`, term);
		//db.set(`termNames/${term.name.toLowerCase()}/.${this.termID}`, WrapDBValue(true, {merge: true}));
	}
}