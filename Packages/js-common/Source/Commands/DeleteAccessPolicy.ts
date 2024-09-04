import {Command, CommandMeta, DBHelper, dbp, GetDocs, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserHidden} from "../DB/userHiddens/@UserHidden.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetAccessPolicy} from "../DB/accessPolicies.js";
import {AccessPolicy} from "../DB/accessPolicies/@AccessPolicy.js";
import {PERMISSIONS} from "../DB.js";

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
		AssertV(PERMISSIONS.AccessPolicy.Delete(this.userInfo.id, this.oldData));
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