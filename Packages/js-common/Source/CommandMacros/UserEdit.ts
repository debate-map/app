import {Command, dbp} from "mobx-graphlink";
import {GetUser} from "../DB/users.js";

export function UserEdit(targetClass: typeof Command) {
	const Validate_old = targetClass.prototype["Validate"];
	targetClass.prototype["Validate"] = function() {
		const result = Validate_old.apply(this);
		const this_ = this as Command<any, any> & {user_oldEditCount?: number};
		const user = GetUser(this_.userInfo.id);
		if (user) {
			this_.user_oldEditCount = user.edits ?? 0;
		}
		return result;
	};

	const DeclareDBUpdates_old = targetClass.prototype.DeclareDBUpdates;
	targetClass.prototype.DeclareDBUpdates = function(db) {
		DeclareDBUpdates_old.call(this, db);
		const this_ = this as Command<any, any> & {user_oldEditCount?: number};
		if (this_.user_oldEditCount != null) {
			db.set(dbp`users/${this_.userInfo.id}/.edits`, this_.user_oldEditCount + 1);
			db.set(dbp`users/${this_.userInfo.id}/.lastEditAt`, Date.now());
		}
	};
}