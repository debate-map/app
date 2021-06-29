import {MergeDBUpdates, GetAsync, GetDoc, Command} from "web-vcore/nm/mobx-graphlink.js";
import {GetMap} from "./Store/db/maps.js";
import {IsString, IsFunction} from "web-vcore/nm/js-vextensions.js";
import {GetUser} from "./Store/db/users.js";

export function MapEdit(targetClass: Function);
export function MapEdit(mapIDKey: string);
export function MapEdit(...args) {
	let mapIDKey = "mapID";
	if (IsFunction(args[0])) {
		ApplyToClass(args[0]);
	} else {
		mapIDKey = args[0];
		return ApplyToClass;
	}

	function ApplyToClass(targetClass: Function) {
		/* if (targetClass.prototype instanceof Command_Old) {
			const oldPrepare = targetClass.prototype.Prepare;
			targetClass.prototype.Prepare = async function () {
				await oldPrepare.apply(this);
				const mapID = this.payload[mapIDKey];
				if (mapID) {
					this.map_oldEditCount = (await GetAsync(() => GetMap(mapID)))?.edits ?? 0;
				}
			};
		} */

		if (targetClass.prototype instanceof Command) {
			const oldValidate = targetClass.prototype.Validate;
			targetClass.prototype.Validate = function() {
				const result = oldValidate.apply(this);
				const mapID = this.payload[mapIDKey];
				if (mapID) {
					const map = GetMap(mapID);
					if (map != null) {
						this.map_oldEditCount = map.edits ?? 0;
					}
				}
				return result;
			};
		}

		const oldGetDBUpdates = targetClass.prototype.GetDBUpdates;
		targetClass.prototype.GetDBUpdates = function() {
			const updates = oldGetDBUpdates.apply(this);
			const newUpdates = {};
			if (this.map_oldEditCount != null) {
				const mapID = this.payload[mapIDKey];
				if (mapID) {
					newUpdates[`maps/${mapID}/.edits`] = this.map_oldEditCount + 1;
					newUpdates[`maps/${mapID}/.editedAt`] = Date.now();
				}
			}
			return MergeDBUpdates(updates, newUpdates);
		};
	}
}

export function UserEdit(targetClass: Function) {
	/* if (targetClass.prototype instanceof Command_Old) {
		const oldPrepare = targetClass.prototype.Prepare;
		targetClass.prototype.Prepare = async function () {
			await oldPrepare.apply(this);
			this.user_oldEditCount = (await GetAsync(() => GetUserExtraInfo(this.userInfo.id)))?.edits ?? 0;
		};
	} */

	if (targetClass.prototype instanceof Command) {
		const oldValidate = targetClass.prototype.Validate;
		targetClass.prototype.Validate = function() {
			const result = oldValidate.apply(this);
			const user = GetUser(this.userInfo.id);
			if (user) {
				this.user_oldEditCount = user.edits ?? 0;
			}
			return result;
		};
	}

	const oldGetDBUpdates = targetClass.prototype.GetDBUpdates;
	targetClass.prototype.GetDBUpdates = function() {
		const updates = oldGetDBUpdates.apply(this);
		const newUpdates = {};
		if (this.user_oldEditCount != null) {
			newUpdates[`users/${this.userInfo.id}/.edits`] = this.user_oldEditCount + 1;
			newUpdates[`users/${this.userInfo.id}/.lastEditAt`] = Date.now();
		}
		return MergeDBUpdates(updates, newUpdates);
	};
}