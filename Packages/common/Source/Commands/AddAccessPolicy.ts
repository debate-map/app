import {AccessPolicy} from "DB/accessPolicies/@AccessPolicy.js";
import {AssertValidate, dbp, GenerateUUID, WrapDBValue, Command, CommandMeta, SimpleSchema, DBHelper} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({$policy: {$ref: "AccessPolicy"}}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddAccessPolicy extends Command<{policy: AccessPolicy}, {id: string}> {
	Validate() {
		const {policy} = this.payload;
		policy.id = GenerateUUID();
		policy.creator = this.userInfo.id;
		policy.createdAt = Date.now();

		this.returnData = {id: policy.id};
		AssertValidate("AccessPolicy", policy, "Access-policy invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {policy} = this.payload;
		db.set(dbp`accessPolicies/${policy.id}`, policy);
	}
}