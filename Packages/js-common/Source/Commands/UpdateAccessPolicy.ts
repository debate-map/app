import {AssertValidate, Command, AssertV, CommandMeta, DBHelper, dbp, DeriveJSONSchema, SimpleSchema} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetAccessPolicy} from "../DB/accessPolicies.js";
import {AccessPolicy} from "../DB/accessPolicies/@AccessPolicy.js";
import {PERMISSIONS} from "../DB.js";

const MTClass = AccessPolicy;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
		$id: {$ref: "UUID"},
		$updates: DeriveJSONSchema(MTClass, {includeOnly: ["name", /*"base",*/ "permissions", "permissions_userExtends"], makeOptional_all: true}),
	}),
})
export class UpdateAccessPolicy extends Command<{id: string, updates: Partial<MT>}, {}> {
	oldData: MT;
	newData: MT;
	Validate() {
		const {id, updates} = this.input;
		this.oldData = GetAccessPolicy.NN(id);
		AssertV(PERMISSIONS.AccessPolicy.Modify(this.userInfo.id, this.oldData));
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, "New-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.input;
		db.set(dbp`accessPolicies/${id}`, this.newData);
	}
}