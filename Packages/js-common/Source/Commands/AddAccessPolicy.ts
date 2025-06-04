import {AssertValidate, dbp, GenerateUUID, WrapDBValue, Command, CommandMeta, SimpleSchema, DBHelper} from "mobx-graphlink";
import {AccessPolicy} from "../DB/accessPolicies/@AccessPolicy.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";

@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({$policy: {$ref: AccessPolicy.name}}),
	responseSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddAccessPolicy extends Command<{policy: AccessPolicy}, {id: string}> {
	Validate() {
		const {policy} = this.input;
		policy.id = this.GenerateUUID_Once("id");
		policy.creator = this.userInfo.id;
		policy.createdAt = Date.now();

		this.response = {id: policy.id};
		AssertValidate(AccessPolicy.name, policy, "Access-policy invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {policy} = this.input;
		db.set(dbp`accessPolicies/${policy.id}`, policy);
	}
}