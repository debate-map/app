import {IsFunction} from "js-vextensions";
import {Command, dbp} from "mobx-graphlink";
import {GetMap} from "../DB/maps.js";

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
			const this_ = this as Command<any, any> & {input: any, map_oldEditCount?: number};
			const mapID = this_.input[mapIDKey];
			if (mapID) {
				const map = GetMap(mapID);
				if (map != null) {
					this_.map_oldEditCount = map.edits ?? 0;
				}
			}
			return result;
		};

		const DeclareDBUpdates_old = targetClass.prototype.DeclareDBUpdates;
		targetClass.prototype.DeclareDBUpdates = function(db) {
			DeclareDBUpdates_old.call(this, db);
			const this_ = this as Command<any, any> & {input: any, map_oldEditCount?: number};
			if (this_.map_oldEditCount != null) {
				const mapID = this_.input[mapIDKey];
				if (mapID) {
					db.set(dbp`maps/${mapID}/.edits`, this_.map_oldEditCount + 1);
					db.set(dbp`maps/${mapID}/.editedAt`, Date.now());
				}
			}
		};
	}
}