import {GetAsync, GetDoc, Command, dbp, DeclareDBUpdates_Helper} from "web-vcore/nm/mobx-graphlink.js";
import {IsString, IsFunction, Assert} from "web-vcore/nm/js-vextensions.js";
import {GetMap} from "./DB/maps.js";
import {GetUser} from "./DB/users.js";

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

	function ApplyToClass(targetClass: typeof Command) {
		const Validate_old = targetClass.prototype["Validate"];
		targetClass.prototype["Validate"] = function() {
			const result = Validate_old.apply(this);
			const mapID = this.payload[mapIDKey];
			if (mapID) {
				const map = GetMap(mapID);
				if (map != null) {
					this.map_oldEditCount = map.edits ?? 0;
				}
			}
			return result;
		};

		const DeclareDBUpdates_old = targetClass.prototype.DeclareDBUpdates;
		targetClass.prototype.DeclareDBUpdates = function(db) {
			DeclareDBUpdates_old.call(this, db);
			if (this.map_oldEditCount != null) {
				const mapID = this.payload[mapIDKey];
				if (mapID) {
					db.set(dbp`maps/${mapID}/.edits`, this.map_oldEditCount + 1);
					db.set(dbp`maps/${mapID}/.editedAt`, Date.now());
				}
			}
		};
	}
}

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