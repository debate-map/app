import {AddSchema, GetSchemaJSON, NewSchema, AssertValidate, GetAsync, Command, AssertV, CommandMeta, DBHelper, dbp, SimpleSchema, DeriveJSONSchema, ClassKeys} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {MapNodePhrasing} from "../DB/nodePhrasings/@MapNodePhrasing.js";
import {GetNodePhrasing} from "../DB/nodePhrasings.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

const MTClass = MapNodePhrasing;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {$ref: "UUID"},
		$updates: DeriveJSONSchema(MTClass, {includeOnly: ["type", "text_base", "text_negation", "text_question", "note", "terms"], makeOptional_all: true}),
	}),
})
export class UpdatePhrasing extends Command<{id: string, updates: Partial<MT>}> {
	oldData: MT;
	newData: MT;
	Validate() {
		const {id, updates} = this.payload;
		this.oldData = GetNodePhrasing.NN(id);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`nodePhrasings/${id}`, this.newData);
	}
}