import {AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodePhrasing} from "../DB/nodePhrasings.js";
import {NodePhrasing} from "../DB/nodePhrasings/@NodePhrasing.js";
import {PERMISSIONS} from "../DB.js";

const MTClass = NodePhrasing;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
		$id: {$ref: "UUID"},
		$updates: DeriveJSONSchema(MTClass, {includeOnly: ["type", "text_base", "text_negation", "text_question", "text_narrative", "note", "terms", "references"], makeOptional_all: true}),
	}),
})
export class UpdatePhrasing extends Command<{id: string, updates: Partial<MT>}> {
	oldData: MT;
	newData: MT;
	Validate() {
		const {id, updates} = this.input;
		this.oldData = GetNodePhrasing.NN(id);
		AssertV(PERMISSIONS.NodePhrasing.Modify(this.userInfo.id, this.oldData));
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.input;
		db.set(dbp`nodePhrasings/${id}`, this.newData);
	}
}