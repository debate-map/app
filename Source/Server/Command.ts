import {FirebaseData} from "Store/firebase";
import {GetUserID} from "Store/firebase/users";
import u from "updeep";
import {ApplyDBUpdates, ApplyDBUpdates_Local, DBPath, RemoveHelpers} from "../Frame/Database/DatabaseHelpers";

export class CommandUserInfo {
	id: string;
}

let currentCommandRun_listeners = null;
async function WaitTillCurrentCommandFinishes() {
	return new Promise((resolve, reject)=> {
		currentCommandRun_listeners.push({resolve, reject});
	});
}
function OnCurrentCommandFinished() {
	let currentCommandRun_listeners_copy = currentCommandRun_listeners;
	currentCommandRun_listeners = null;
	for (let listener of currentCommandRun_listeners_copy) {
		listener.resolve();
	}
}

export abstract class Command<Payload> {
	constructor(payload: Payload) {
		this.userInfo = {id: GetUserID()}; // temp
		this.type = this.constructor.name;
		this.payload = payload;
		//this.Extend(payload);
		//Object.setPrototypeOf(this, Object.getPrototypeOf({}));
	}
	userInfo: CommandUserInfo;
	type: string;
	payload: Payload;
	returnData;

	// these methods are executed on the server (well, will be later)
	// ==========

	// parent commands should call MarkAsSubcommand() immediately after setting a subcommand's payload
	asSubcommand = false;
	MarkAsSubcommand() {
		this.asSubcommand = true;
		this.Validate_Early();
		return this;
	}

	/** [sync] Validates the payload data. (ie. the validation that doesn't require accessing the database) */
	Validate_Early() {}
	/** [async] Transforms the payload data, combines it with database data, and so on, in preparation for the database-updates-map construction. */
	abstract Prepare(): Promise<void>
	/** [async] Validates the prepared data, mostly using ajv shape-validation. */
	abstract Validate(): Promise<void>
	/** [sync] Retrieves the actual database updates that are to be made. (so we can do it in one atomic call) */
	abstract GetDBUpdates(): {}

	async PreRun() {
		RemoveHelpers(this.payload); // have this run locally, before sending, to save on bandwidth
		this.Validate_Early();
		await this.Prepare();
		await this.Validate();
	}
	/** [async] Validates the data, prepares it, and executes it -- thus applying it into the database. */
	async Run() {
		while (currentCommandRun_listeners) {
			await WaitTillCurrentCommandFinishes();
		}
		currentCommandRun_listeners = [];
		
		MaybeLog(a=>a.commands, ()=>`Running command. @type:${this.constructor.name} @payload(${ToJSON(this.payload)})`);

		try {
			await this.PreRun();

			let dbUpdates = this.GetDBUpdates();
			await this.Validate_LateHeavy(dbUpdates);
			//FixDBUpdates(dbUpdates);
			//await store.firebase.helpers.DBRef().update(dbUpdates);
			await ApplyDBUpdates(DBPath(), dbUpdates);

			//MaybeLog(a=>a.commands, ()=>`Finishing command. @type:${this.constructor.name} @payload(${ToJSON(this.payload)}) @dbUpdates(${ToJSON(dbUpdates)})`);
			MaybeLog(a=>a.commands, l=>l(`Finishing command. @type:${this.constructor.name} @payload(`, this.payload, `) @dbUpdates(`, dbUpdates, `)`));
		} finally {
			OnCurrentCommandFinished();
		}
		
		// later on (once set up on server), this will send the data back to the client, rather than return it
		return this.returnData;
	}

	// standard validation of common paths/object-types; perhaps disable in production
	async Validate_LateHeavy(dbUpdates: any) {
		// validate "nodes/X"
		/*let nodesBeingUpdated = (dbUpdates.VKeys() as string[]).map(a=> {
			let match = a.match(/^nodes\/([0-9]+).*#/);
			return match ? match[1].ToInt() : null;
		}).filter(a=>a).Distinct();
		for (let nodeID of nodesBeingUpdated) {
			let oldNodeData = await GetAsync_Raw(()=>GetNode(nodeID));
			let updatesForNode = dbUpdates.Props().filter(a=>a.name.match(`^nodes/${nodeID}($|/)`));

			let newNodeData = oldNodeData;
			for (let update of updatesForNode) {
				newNodeData = u.updateIn(update.name.replace(new RegExp(`^nodes/${nodeID}($|/)`), "").replace(/\//g, "."), u.constant(update.value), newNodeData);
			}
			if (newNodeData != null) { // (if null, means we're deleting it, which is fine)
				AssertValidate("MapNode", newNodeData, `New node-data is invalid.`);
			}
		}*/

		// locally-apply db-updates, then validate the result (for now, only works for already-loaded data paths)
		let newData = RemoveHelpers(Clone(State(`firebase/data/${DBPath()}`)));
		newData = ApplyDBUpdates_Local(newData, dbUpdates);
		ValidateDBData(newData);
	}
}

export function ValidateDBData(data: FirebaseData) {
	for (let map of (data.maps || {}).VValues(true)) AssertValidate("Map", map, `Map invalid`);
	for (let node of (data.nodes || {}).VValues(true)) AssertValidate("MapNode", node, `Node invalid`);
	for (let revision of (data.nodeRevisions || {}).VValues(true)) AssertValidate("MapNodeRevision", revision, `Node-revision invalid`);
	for (let termComp of (data.termComponents || {}).VValues(true)) AssertValidate("TermComponent", termComp, `Term-component invalid`);
	for (let term of (data.terms || {}).VValues(true)) AssertValidate("Term", term, `Term invalid`);
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

	for (let update of updatesToMerge) {
		// if an update-to-merge exists for a path, remove any base-updates starting with that path (since the to-merge ones have priority)
		if (update.data == null) {
			for (let update2 of baseUpdates.slice()) { // make copy, since Remove() seems to break iteration otherwise
				if (update2.path.startsWith(update.path)) {
					baseUpdates.Remove(update2);
				}
			}
		}
	}

	let finalUpdates = [] as Update[];
	for (let update of baseUpdates) {
		let updatesToMergeIntoThisOne: Update[] = updatesToMerge.filter(update2=> {
			return update2.path.startsWith(update.path);
		});
		for (let updateToMerge of updatesToMergeIntoThisOne) {
			let updateToMerge_relativePath = updateToMerge.path.substr(`${update.path}/`.length);

			//if (updateToMerge.data) {
			// assume that the update-to-merge has priority, so have it completely overwrite the data at its path
			update.data = u.updateIn(updateToMerge_relativePath.replace(/\//g, "."), u.constant(updateToMerge.data), update.data);
			/*} else {
				update.data = null;
			}*/

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