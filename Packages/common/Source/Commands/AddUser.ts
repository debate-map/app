import {AssertV, AssertValidate, Command, dbp, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {User} from "../DB/users/@User.js";
import {UserHidden} from "../DB/userHiddens/@UserHidden.js";
import {systemUserID} from "../DB_Constants.js";

@UserEdit
export class AddUser extends Command<{user: User, userHidden: UserHidden}, string> {
	id: string;
	Validate() {
		const {user, userHidden} = this.payload;
		AssertV(this.userInfo.id == systemUserID, "Only the system-user can add a user.");

		this.id = this.id ?? GenerateUUID();
		user.joinDate = Date.now();
		AssertValidate("User", user, "User invalid.");

		userHidden.id = this.id;
		AssertValidate("UserHidden", userHidden, "User's hidden-data is invalid.");

		this.returnData = this.id;
	}

	DeclareDBUpdates(db) {
		const {user, userHidden} = this.payload;
		db.set(dbp`users/${this.id}`, user);
		db.set(dbp`userHiddens/${this.id}`, userHidden);
	}
}