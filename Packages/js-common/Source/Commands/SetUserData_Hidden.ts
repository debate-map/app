import {Command, AssertV, AssertValidate, GetSchemaJSON, NewSchema, dbp, CommandMeta, DeriveJSONSchema, DBHelper} from "mobx-graphlink";
import {CE, GetEntries, GetValues, GetValues_ForSchema} from "js-vextensions";
import {UserHidden} from "../DB/userHiddens/@UserHidden.js";
import {GetUserHidden} from "../DB/userHiddens.js";
import {NodeType} from "../DB/nodes/@NodeType.js";

const MTClass = UserHidden;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@CommandMeta({
	/*payloadInfo: ()=>({
		id: {jsonSchema: {$ref: "UUID"}, gqlSchema: "String"},
		//updates: {jsonSchema: ()=>DeriveSchema(MTName, {includeOnly}), gqlSchema: DeriveGQLSchema(MTName, {includeOnly})},
		updates: DeriveJSONAndGQLSchema(MTName, {includeOnly: [
			"email", "providerData",
			"backgroundID", "backgroundCustom_enabled", "backgroundCustom_color", "backgroundCustom_url", "backgroundCustom_position",
		]}),
	}),*/
	payloadSchema: ()=>({
		properties: {
			id: {$ref: "UUID"},
			updates: DeriveJSONSchema(MTClass, {
				includeOnly: [
					"email", "providerData",
					"backgroundID", "backgroundCustom_enabled", "backgroundCustom_color", "backgroundCustom_url", "backgroundCustom_position",
					"addToStream",
				],
				makeOptional_all: true,
			}),
		},
		required: ["id", "updates"],
	}),
})
export class SetUserData_Hidden extends Command<{id: string, updates: Partial<MT>}, {}> {
	oldData: MT;
	newData: MT;
	Validate() {
		const {id, updates} = this.payload;
		this.oldData = GetUserHidden.NN(id);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`userHiddens/${id}`, this.newData);
	}
}