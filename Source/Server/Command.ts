import * as u from "updeep";
export abstract class Command<Payload> {
	constructor(payload: Payload) {
		this.type = this.constructor.name;
		this.payload = payload;
		//this.Extend(payload);
		//Object.setPrototypeOf(this, Object.getPrototypeOf({}));
	}
	type: string;
	payload: Payload;
	returnData;

	// these methods are executed on the server (well, will be later)
	// ==========

	/** [sync] Validates the payload data. (ie. the validation that doesn't require accessing the database) */
	Validate_Early() {};
	/** [async] Transforms the payload data, combines it with database data, and so on, in preparation for the database-updates-map construction. */
	abstract Prepare(): Promise<void>;
	/** [async] Validates the prepared data, mostly using ajv shape-validation. */
	abstract Validate(): Promise<void>;
	/** [sync] Retrieves the actual database updates that are to be made. (so we can do it in one atomic call) */
	abstract GetDBUpdates(): {};

	/** [async] Validates the data, prepares it, and executes it -- thus applying it into the database. */
	async Run() {
		this.Validate_Early();
		await this.Prepare();
		await this.Validate();

		let dbUpdates = this.GetDBUpdates();
		//FixDBUpdates(dbUpdates);
		await store.firebase.helpers.Ref().update(dbUpdates);

		// later on (once set up on server), this will send the data back to the client, rather than return it
		return this.returnData;
	}
}

/*type Update = {path: string, data: any};
function FixDBUpdates(updatesMap) {
	let updates = updatesMap.Props().map(prop=>({path: prop.name, data: prop.value}));
	for (let update of updates) {
		let otherUpdatesToMergeIntoThisOne: Update[] = updates.filter(update2=> {
			return update2.path.startsWith(update.path);
		});
		for (let updateToMerge of otherUpdatesToMergeIntoThisOne) {
			delete updates[updateToMerge.path];

			let updateToMerge_relativePath = updateToMerge.path.substr(0, update.path.length);
			update.data = u.updateIn(updateToMerge_relativePath, constant(updateToMerge.data), update.data)
		}
	}
}*/
type Update = {path: string, data: any};
export function MergeDBUpdates(baseUpdatesMap, updatesToMergeMap) {
	let baseUpdates = baseUpdatesMap.Props().map(prop=>({path: prop.name, data: prop.value})) as Update[];
	let updatesToMerge = updatesToMergeMap.Props().map(prop=>({path: prop.name, data: prop.value})) as Update[];

	let finalUpdates = [] as Update[];
	for (let update of baseUpdates) {
		let updatesToMergeIntoThisOne: Update[] = updatesToMerge.filter(update2=> {
			return update2.path.startsWith(update.path);
		});
		for (let updateToMerge of updatesToMergeIntoThisOne) {
			let updateToMerge_relativePath = updateToMerge.path.substr(`${update.path}/`.length);
			// assume that the update-to-merge has priority, so have it completely overwrite the data at its path
			update.data = u.updateIn(updateToMerge_relativePath.replace(/\//g, "."), u.constant(updateToMerge.data), update.data);
			// remove from updates-to-merge list (since we just merged it)
			updatesToMerge.Remove(updateToMerge);
		}

		finalUpdates.push(update);
	}

	// for any "update to merge" which couldn't be merged into one of the base-updates, just add it as its own update (it won't clash with the others)
	for (let update of updatesToMerge) {
		finalUpdates.push(update);
	}

	let finalUpdatesMap = finalUpdates.reduce((result, current)=>result.VSet(current.path, current.data), {});
	return finalUpdatesMap;
}

// template
// ==========
/*
	Validate_Early() {
	}

	async Prepare() {
	}
	async Validate() {
	}

	GetDBUpdates() {
		let updates = {
		};
		return updates;
	}
*/