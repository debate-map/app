import {Command, dbp} from "mobx-graphlink";
import {GetUser} from "../DB/users.js";

export function UserEdit(targetClass: typeof Command) {
	const Validate_old = targetClass.prototype["Validate"];
	targetClass.prototype["Validate"] = function() {
		const result = Validate_old.apply(this);
		const user = GetUser(this.userInfo.id);
		if (user) {
			this.user_oldEditCount = user.edits ?? 0;
		}
		return result;
	};

	const DeclareDBUpdates_old = targetClass.prototype.DeclareDBUpdates;
	targetClass.prototype.DeclareDBUpdates = function(db) {
		DeclareDBUpdates_old.call(this, db);
		if (this.user_oldEditCount != null) {
			db.set(dbp`users/${this.userInfo.id}/.edits`, this.user_oldEditCount + 1);
			db.set(dbp`users/${this.userInfo.id}/.lastEditAt`, Date.now());
		}
	};
}