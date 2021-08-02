import {CE} from "web-vcore/nm/js-vextensions.js";
import {AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, GetSchemaJSON, NewSchema, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {GetAccessPolicy} from "../DB/accessPolicies.js";
import {AccessPolicy} from "../DB/accessPolicies/@AccessPolicy.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

const MTClass = AccessPolicy;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {$ref: "UUID"},
		$updates: DeriveJSONSchema(MTClass, {includeOnly: ["name", /*"base",*/ "permissions", "permissions_userExtends"], makeOptional_all: true}),
	}),
})
export class UpdateAccessPolicy extends Command<{id: string, updates: Partial<MT>}, {}> {
	oldData: MT;
	newData: MT;
	Validate() {
		const {id, updates} = this.payload;
		this.oldData = GetAccessPolicy.NN(id);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, "New-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`accessPolicies/${id}`, this.newData);
	}
}