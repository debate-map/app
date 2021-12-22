import {AssertValidate, dbp, GenerateUUID, WrapDBValue, Command, CommandMeta, SimpleSchema, DBHelper} from "web-vcore/nm/mobx-graphlink.js";
import {AccessPolicy} from "../DB/accessPolicies/@AccessPolicy.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({$policy: {$ref: AccessPolicy.name}}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddAccessPolicy extends Command<{policy: AccessPolicy}, {id: string}> {
	Validate() {
		const {policy} = this.payload;
		policy.id = this.GenerateUUID_Once("id");
		policy.creator = this.userInfo.id;
		policy.createdAt = Date.now();

		this.returnData = {id: policy.id};
		AssertValidate(AccessPolicy.name, policy, "Access-policy invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {policy} = this.payload;
		db.set(dbp`accessPolicies/${policy.id}`, policy);
	}
}