import { GetDataAsync } from "Frame/Database/DatabaseHelpers";

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
		if (this.payload.mapID) {
			updates[`maps/${this.payload.mapID}/edits`] = this.map_oldEditCount + 1;
			updates[`maps/${this.payload.mapID}/editedAt`] = Date.now();
		}
		return updates;
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
		updates[`userExtras/${this.userInfo.id}/edits`] = this.user_oldEditCount + 1;
		updates[`userExtras/${this.userInfo.id}/lastEditAt`] = Date.now();
		return updates;
	}
}