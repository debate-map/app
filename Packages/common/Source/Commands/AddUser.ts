import {AssertV, AssertValidate, Command, dbp, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {User} from "../DB/users/@User.js";
import {User_Private} from "../DB/users_private/@User_Private.js";
import {systemUserID} from "../DB_Constants.js";

@UserEdit
export class AddUser extends Command<{user: User, user_private: User_Private}, string> {
	id: string;
	Validate() {
		const {user, user_private} = this.payload;
		AssertV(this.userInfo.id == systemUserID, "Only the system-user can add a user.");

		this.id = this.id ?? GenerateUUID();
		user.joinDate = Date.now();
		AssertValidate("User", user, "User invalid.");

		user_private.id = this.id;
		AssertValidate("User_Private", user_private, "User's private-data is invalid.");

		this.returnData = this.id;
	}

	GetDBUpdates() {
		const {user, user_private} = this.payload;
		const updates = {
			[dbp`users/${this.id}`]: user,
			[dbp`users_private/${this.id}`]: user_private,
		};
		return updates;
	}
}