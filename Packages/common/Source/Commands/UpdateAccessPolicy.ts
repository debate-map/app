import {CE} from "web-vcore/nm/js-vextensions.js";
import {AssertValidate, Command, CommandMeta, DBHelper, dbp, GetSchemaJSON, NewSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {GetAccessPolicy} from "../DB/accessPolicies.js";
import {AccessPolicy} from "../DB/accessPolicies/@AccessPolicy.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

type MT = AccessPolicy;
const MTName = "AccessPolicy";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			id: {$ref: "UUID"},
			updates: NewSchema({
				properties: CE(GetSchemaJSON(MTName).properties!).IncludeKeys("name", "base", "permissions_base", "permissions_userExtends"),
			}),
		},
		required: ["id", "updates"],
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