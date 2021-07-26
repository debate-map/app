import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, GenerateUUID, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {User} from "../DB/users/@User.js";
import {UserHidden} from "../DB/userHiddens/@UserHidden.js";
import {systemUserID} from "../DB_Constants.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$user: {$ref: "User"},
		$userHidden: {$ref: "UserHidden"},
	}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
	exposeToGraphQL: false,
})
export class AddUser extends Command<{user: User, userHidden: UserHidden}, {id: string}> {
	Validate() {
		const {user, userHidden} = this.payload;
		AssertV(this.userInfo.id == systemUserID, "Only the system-user can add a user.");

		user.id = this.GenerateUUID_Once("id");
		user.joinDate = Date.now();
		AssertValidate("User", user, "User invalid.");

		userHidden.id = user.id;
		AssertValidate("UserHidden", userHidden, "User's hidden-data is invalid.");

		this.returnData = {id: user.id};
	}

	DeclareDBUpdates(db: DBHelper) {
		const {user, userHidden} = this.payload;
		db.set(dbp`users/${user.id}`, user);
		db.set(dbp`userHiddens/${user.id}`, userHidden);
	}
}