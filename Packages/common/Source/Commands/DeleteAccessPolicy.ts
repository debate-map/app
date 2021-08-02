import {UserHidden} from "DB/userHiddens/@UserHidden.js";
import {GetAsync, Command, AssertV, WrapDBValue, dbp, CommandMeta, DBHelper, SimpleSchema, GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {GetAccessPolicy} from "../DB/accessPolicies.js";
import {AccessPolicy} from "../DB/accessPolicies/@AccessPolicy.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeleteAccessPolicy extends Command<{id: string}, {}> {
	oldData: AccessPolicy;
	userHiddensWithPolicyAsLastUsed: UserHidden[];
	Validate() {
		const {id} = this.payload;
		this.oldData = GetAccessPolicy(id)!;
		AssertUserCanDelete(this, this.oldData);
		this.userHiddensWithPolicyAsLastUsed = GetDocs({
			params: {filter: {
				lastAccessPolicy: {equalTo: id},
			}},
		}, a=>a.userHiddens);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`accessPolicies/${id}`, null);
		for (const userHidden of this.userHiddensWithPolicyAsLastUsed) {
			db.set(dbp`userHiddens/${userHidden.id}/.lastAccessPolicy`, null);
		}
	}
}