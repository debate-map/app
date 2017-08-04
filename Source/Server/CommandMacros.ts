import { GetDataAsync } from "Frame/Database/DatabaseHelpers";
import {MergeDBUpdates} from "./Command";

export function MapEdit(target: Function) {
	let oldPrepare = target.prototype.Prepare;
	target.prototype.Prepare = async function() {
		await oldPrepare.apply(this);
		if (this.payload.mapID) {
			this.map_oldEditCount = await GetDataAsync({addHelpers: false}, "maps", this.payload.mapID, "edits") as number || 0;
		}
	};

	let oldGetDBUpdates = target.prototype.GetDBUpdates;
	target.prototype.GetDBUpdates = function() {
		let updates = oldGetDBUpdates.apply(this);
		let newUpdates = {};
		if (this.payload.mapID) {
			newUpdates[`maps/${this.payload.mapID}/edits`] = this.map_oldEditCount + 1;
			newUpdates[`maps/${this.payload.mapID}/editedAt`] = Date.now();
		}
		return MergeDBUpdates(updates, newUpdates);
	}
}

export function UserEdit(target: Function) {
	let oldPrepare = target.prototype.Prepare;
	target.prototype.Prepare = async function() {
		await oldPrepare.apply(this);
		this.user_oldEditCount = await GetDataAsync({addHelpers: false}, "userExtras", this.userInfo.id, "edits") as number || 0;
	};

	let oldGetDBUpdates = target.prototype.GetDBUpdates;
	target.prototype.GetDBUpdates = function() {
		let updates = oldGetDBUpdates.apply(this);
		let newUpdates = {};
		newUpdates[`userExtras/${this.userInfo.id}/edits`] = this.user_oldEditCount + 1;
		newUpdates[`userExtras/${this.userInfo.id}/lastEditAt`] = Date.now();
		return MergeDBUpdates(updates, newUpdates);
	}
}