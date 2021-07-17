import {Command, AssertV, AssertValidate, GetSchemaJSON, NewSchema, dbp, CommandMeta, DeriveJSONSchema} from "web-vcore/nm/mobx-graphlink.js";
import {CE, GetEntries, GetValues, GetValues_ForSchema} from "web-vcore/nm/js-vextensions.js";
import {UserHidden} from "../DB/userHiddens/@UserHidden.js";
import {GetUserHidden} from "../DB/userHiddens.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";

type MainType = UserHidden;
const MTName = "UserHidden";

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
			updates: DeriveJSONSchema(MTName, {includeOnly: [
				"email", "providerData",
				"backgroundID", "backgroundCustom_enabled", "backgroundCustom_color", "backgroundCustom_url", "backgroundCustom_position",
			]}),
		},
		required: ["id", "updates"],
	}),
})
export class SetUserData_Hidden extends Command<{id: string, updates: Partial<MainType>}, {}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		const {id, updates} = this.payload;
		this.oldData = GetUserHidden.NN(id);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	DeclareDBUpdates(db) {
		const {id} = this.payload;
		db.set(dbp`userHiddens/${id}`, this.newData);
	}
}