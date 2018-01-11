import {RequestPath, Connect, ClearRequestedPaths, GetRequestedPaths} from "./FirebaseConnect";
import {Assert, GetTreeNodesInObjTree, DeepSet} from "js-vextensions";
import {helpers, firebaseConnect} from "react-redux-firebase";
import {FirebaseApplication, DataSnapshot} from "firebase";
import {BaseComponent, ShallowChanged} from "react-vextensions";
import {watchEvents, unWatchEvents} from "react-redux-firebase/dist/actions/query";
import {getEventsFromInput} from "react-redux-firebase/dist/utils";
import {SplitStringBySlash_Cached} from "Frame/Database/StringSplitCache";
//export {DBPath};

export function DBPath(path = "", inVersionRoot = true) {
	Assert(path != null, "Path cannot be null.");
	Assert(IsString(path), "Path must be a string.");
	/*let versionPrefix = path.match(/^v[0-9]+/);
	if (versionPrefix == null) // if no version prefix already, add one (referencing the current version)*/
	if (inVersionRoot)
		path = `v${dbVersion}-${env_short}/${path}`;
	return path;
}
export function DBPathSegments(pathSegments: (string | number)[], inVersionRoot = true) {
	let result = pathSegments;
	if (inVersionRoot) {
		result = ([`v${dbVersion}-${env_short}`] as any).concat(result);
	}
	return result;
}

export function SlicePath(path: string, removeFromEndCount: number, ...itemsToAdd: string[]) {
	//let parts = path.split("/");
	let parts = SplitStringBySlash_Cached(path).slice();
	parts.splice(parts.length - removeFromEndCount, removeFromEndCount, ...itemsToAdd);
	return parts.join("/");
}

Object.prototype._AddFunction_Inline = function DBRef(path = "", inVersionRoot = true) {
	let finalPath = DBPath(path, inVersionRoot);
	return this.ref(finalPath);
}

export type FirebaseApp = FirebaseApplication & {
	// added by react-redux-firebase
	_,
	helpers: {
		ref(path: string): firebase.DatabaseReference,
		set,
		uniqueSet,
		push,
		remove,
		update,
		login(options: {provider: "email?" | "google" | "facebook" | "twitter" | "github" | "anonymous?" | "?", type: "popup" | "?"}),
		logout(),
		uploadFile,
		uploadFiles,
		deleteFile,
		createUser,
		resetPassword,
		watchEvent,
		unWatchEvent,
		storage(): firebase.FirebaseStorage,

		// custom
		DBRef(path?: string, inVersionRoot?: boolean): firebase.DatabaseReference,
	},
};

export function ProcessDBData(data, standardizeForm: boolean, addHelpers: boolean, rootKey: string) {
	var treeNodes = GetTreeNodesInObjTree(data, true);
	for (let treeNode of treeNodes) {
		// turn the should-not-have-been-array arrays (the ones without a "0" property) into objects
		if (standardizeForm && treeNode.Value instanceof Array && treeNode.Value[0] === undefined) {
			// if changing root, we have to actually modify the prototype of the passed-in "data" object
			/*if (treeNode.Value == data) {
				Object.setPrototypeOf(data, Object.getPrototypeOf({}));
				for (var key of Object.keys(data)) {
					if (data[key] === undefined)
						delete data[key];
				}
				continue;
			}*/

			let valueAsObject = {}.Extend(treeNode.Value) as any;
			for (let key in valueAsObject) {
				// if fake array-item added by Firebase/js (just so the array would have no holes), remove it
				//if (valueAsObject[key] == null)
				if (valueAsObject[key] === undefined)
					delete valueAsObject[key];
			}

			if (treeNode.Value == data) treeNode.obj[treeNode.prop] = valueAsObject; // if changing root, we need to modify wrapper.data
			else DeepSet(data, treeNode.PathStr, valueAsObject); // else, we need to use deep-set, because ancestors may have already changed during this transform/processing
		}

		// turn the should-have-been-array objects (the ones with a "0" property) into arrays
		if (standardizeForm && typeof treeNode.Value == "object" && !(treeNode.Value instanceof Array) && treeNode.Value[0] !== undefined) {
			// if changing root, we have to actually modify the prototype of the passed-in "data" object
			/*if (treeNode.Value == data) {
				Object.setPrototypeOf(data, Object.getPrototypeOf([]));
				data.length = data.VKeys(true).filter(a=>IsNumberString(a));
				continue;
			}*/
			
			let valueAsArray = [].Extend(treeNode.Value) as any;

			if (treeNode.Value == data) treeNode.obj[treeNode.prop] = valueAsArray; // if changing root, we need to modify wrapper.data
			else DeepSet(data, treeNode.PathStr, valueAsArray); // else, we need to use deep-set, because ancestors may have already changed during this transform/processing
		}

		// add special _key or _id prop
		if (addHelpers && typeof treeNode.Value == "object") {
			let key = treeNode.prop == "_root" ? rootKey : treeNode.prop;
			if (parseInt(key).toString() == key) {
				treeNode.Value._id = parseInt(key);
				//treeNode.Value._Set("_id", parseInt(key));
			}

			// actually, always set "_key" (in case it's a "_key" that also happens to look like an "_id"/integer)
			//else {
			treeNode.Value._key = key;
			//treeNode.Value._Set("_key", key);
		}
	}
	return treeNodes[0].Value; // get possibly-modified wrapper.data
}

let helperProps = ["_key", "_id"];
/** Note: this mutates the original object. */
export function RemoveHelpers(data) {
	var treeNodes = GetTreeNodesInObjTree(data, true);
	for (let treeNode of treeNodes) {
		if (helperProps.Contains(treeNode.prop))
			delete treeNode.obj[treeNode.prop];
	}
	return data;
}
export function GetUpdates(oldData, newData, useNullInsteadOfUndefined = true) {
	let result = {};
	for (let key of oldData.VKeys(true).concat(newData.VKeys(true))) {
		if (newData[key] !== oldData[key]) {
			result[key] = newData[key];
			if (newData[key] === undefined && useNullInsteadOfUndefined) {
				result[key] = null;
			}
		}
	}
	return RemoveHelpers(result);
}

class DBPathInfo {
	lastTimestamp = -1;
	cachedData;
}
let pathInfos = {} as {[path: string]: DBPathInfo};

export class GetData_Options {
	inVersionRoot? = true;
	makeRequest? = true;
	useUndefinedForInProgress? = false;
	queries?: any;
}

G({GetData});
/** Begins request to get data at the given path in the Firebase database.
 * 
 * Returns undefined when the current-data for the path is null/non-existent, but a request is in-progress.
 * Returns null when we've completed the request, and there is no data at that path. */
//export function GetData(pathSegments: (string | number)[], options?: GetData_Options) {
/*export function GetData(pathSegment1: string | number, pathSegment2: string | number, ...pathSegments: (string | number)[]);
export function GetData(options: GetData_Options, pathSegment1: string | number, pathSegment2: string | number, ...pathSegments: (string | number)[]);*/
export function GetData(...pathSegments: (string | number)[]);
export function GetData(options: GetData_Options, ...pathSegments: (string | number)[]);
export function GetData(...args) {
	let pathSegments: (string | number)[], options: GetData_Options;
	if (typeof args[0] == "string") pathSegments = args;
	else [options, ...pathSegments] = args;
	options = E(new GetData_Options(), options);

	if (__DEV__) {
		Assert(pathSegments.All(segment=>typeof segment == "number" || !segment.Contains("/")),
			`Each string path-segment must be a plain prop-name. (ie. contain no "/" separators) @segments(${pathSegments})`);
	}

	pathSegments = DBPathSegments(pathSegments, options.inVersionRoot);

	/*Assert(!path.endsWith("/"), "Path cannot end with a slash. (This may mean a path parameter is missing)");
	Assert(!path.Contains("//"), "Path cannot contain a double-slash. (This may mean a path parameter is missing)");*/

	let path = pathSegments.join("/");
	/*if (options.queries && options.queries.VKeys().length) {
		let queriesStr = "";
		for (let {name, value, index} of options.queries.Props()) {
			queriesStr += (index == 0 ? "#" : "&") + name + "=" + value;
		}
		pathSegments[pathSegments.length - 1] = pathSegments.Last() + queriesStr;
		path += queriesStr.replace(/[#=]/g, "_");
	}*/

	if (options.makeRequest) {
		let queriesStr = "";
		if (options.queries && options.queries.VKeys().length) {
			for (let {name, value, index} of options.queries.Props()) {
				queriesStr += (index == 0 ? "#" : "&") + name + "=" + value;
			}
		}
		RequestPath(path + queriesStr);
	}

	//let result = State("firebase", "data", ...SplitStringByForwardSlash_Cached(path)) as any;
	let result = State("firebase", "data", ...pathSegments) as any;
	//let result = State("firebase", "data", ...pathSegments) as any;
	if (result == null && options.useUndefinedForInProgress) {
		let requestCompleted = State().firebase.requested[path];
		if (!requestCompleted) return undefined; // undefined means, current-data for path is null/non-existent, but we haven't completed the current request yet
		else return null; // null means, we've completed the request, and there is no data at that path
	}
	return result;
}

export class GetDataAsync_Options {
	inVersionRoot? = true;
	addHelpers? = true;
}

G({GetDataAsync});
// usually you'll want to use "await GetAsync(()=>GetNode(id))" instead
//export async function GetDataAsync(path: string, inVersionRoot = true, addHelpers = true, firebase: firebase.DatabaseReference = store.firebase.helpers.ref("")) {
//export async function GetDataAsync(path: string, inVersionRoot = true, addHelpers = true) {
/*export async function GetDataAsync(pathSegment1: string | number, pathSegment2: string | number, ...pathSegments: (string | number)[]);
export async function GetDataAsync(options: GetDataAsync_Options, pathSegment1: string | number, pathSegment2: string | number, ...pathSegments: (string | number)[]);*/
export async function GetDataAsync(...pathSegments: (string | number)[]);
export async function GetDataAsync(options: GetDataAsync_Options, ...pathSegments: (string | number)[]);
export async function GetDataAsync(...args) {
	let pathSegments: (string | number)[], options: GetDataAsync_Options;
	if (typeof args[0] == "string") pathSegments = args;
	else [options, ...pathSegments] = args;
	options = E(new GetDataAsync_Options(), options);

	let firebase = store.firebase.helpers;
	return await new Promise((resolve, reject) => {
		//firebase.child(DBPath(path, inVersionRoot)).once("value",
		let path = pathSegments.join("/");
		firebase.DBRef(path, options.inVersionRoot).once("value",
			(snapshot: DataSnapshot)=> {
				let result = snapshot.val();
				if (result)
					result = ProcessDBData(result, true, options.addHelpers, pathSegments.Last()+"");
				resolve(result);
			},
			(ex: Error)=> {
				reject(ex);
			});
	});
}

/**
 * Usage: await GetAsync(()=>GetNode(123))
 * It has the same processing as in Connect(), except callable using async/await.
 * It basically makes a pretend component -- connecting to firebase, and resolving the promise once the condition below is fulfilled:
 * 	It re-calls the db-getter func (after the last generation's requested-path-data was all received), and finds that no new paths are requested.
 */
G({GetAsync});
export async function GetAsync<T>(dbGetterFunc: ()=>T, statsLogger?: ({requestedPaths: string})=>void): Promise<T> {
	Assert(!g.inConnectFunc, "Cannot run GetAsync() from within a Connect() function.");
	//Assert(!g.inGetAsyncFunc, "Cannot run GetAsync() from within a GetAsync() function.");
	let firebase = store.firebase;

	let result;

	let requestedPathsSoFar = {};
	let requestedPathsSoFar_last;
	do {
		requestedPathsSoFar_last = Clone(requestedPathsSoFar);

		ClearRequestedPaths();
		result = dbGetterFunc();
		let newRequestedPaths = GetRequestedPaths().Except(requestedPathsSoFar.VKeys());

		unWatchEvents(firebase, store.dispatch, getEventsFromInput(newRequestedPaths)); // do this just to trigger re-get
		// start watching paths (causes paths to be requested)
		watchEvents(firebase, store.dispatch, getEventsFromInput(newRequestedPaths));

		for (let path of newRequestedPaths) {
			requestedPathsSoFar[path] = true;
			// wait till data is received
			await WaitTillPathDataIsReceived(path);
		}

		// stop watching paths (since we already got their data)
		// todo: find correct way of unwatching events; the way below seems to sometimes unwatch while still needed watched
		// for now, we just never unwatch
		//unWatchEvents(firebase, store.dispatch, getEventsFromInput(newRequestedPaths));
	} while (ShallowChanged(requestedPathsSoFar, requestedPathsSoFar_last))

	/*let paths_final = requestedPathsSoFar.VKeys();
	let paths_data = await Promise.all(paths_final.map(path=>GetDataAsync(path)));
	let listener = ()=> {
		listener(); // unsubscribe
	};
	store.subscribe(listener);*/

	if (statsLogger) {
		statsLogger({requestedPaths: requestedPathsSoFar});
	}

	return result;
}
G({GetAsync});
export async function GetAsync_Raw<T>(dbGetterFunc: ()=>T, statsLogger?: ({requestedPaths: string})=>void): Promise<T> {
	return RemoveHelpers(Clone(await GetAsync(dbGetterFunc, statsLogger)));
}
export function WaitTillPathDataIsReceived(path: string): Promise<any> {
	return new Promise((resolve, reject)=> {
		let pathDataReceived = (State as any)().firebase.requested[path];
		// if data already received, return right away
		if (pathDataReceived) {
			resolve();
		}

		// else, add listener, and wait till store received the data (then return it)
		let listener = ()=> {
			//pathDataReceived = State(a=>a.firebase.requested[path]);
			pathDataReceived = (State as any)().firebase.requested[path];
			if (pathDataReceived) {
				unsubscribe();
				resolve();
			}
		};
		let unsubscribe = store.subscribe(listener);
	});
}

/*;(function() {
	var Firebase = require("firebase");
	var FirebaseRef = Firebase.database.Reference;

	Firebase.ABORT_TRANSACTION_NOW = {};

	var originalTransaction = FirebaseRef.prototype.transaction;
	FirebaseRef.prototype.transaction = function transaction(updateFunction, onComplete, applyLocally) {
		var aborted, tries = 0, ref = this, updateError;

		var promise = new Promise(function(resolve, reject) {
			var wrappedUpdate = function(data) {
				// Clone data in case updateFunction modifies it before aborting.
				var originalData = JSON.parse(JSON.stringify(data));
				aborted = false;
				try {
					if (++tries > 100) throw new Error('maxretry');
					var result = updateFunction.call(this, data);
					if (result === undefined) {
						aborted = true;
						result = originalData;
					} else if (result === Firebase.ABORT_TRANSACTION_NOW) {
						aborted = true;
						result = undefined;
					}
					return result;
				} catch (e) {
					// Firebase propagates exceptions thrown by the update function to the top level.	So
					// catch them here instead, reject the promise, and abort the transaction by returning
					// undefined.
					updateError = e;
				}
			};

			function txn() {
				try {
					originalTransaction.call(ref, wrappedUpdate, function(error, committed, snapshot) {
						error = error || updateError;
						var result;
						if (error && (error.message === 'set' || error.message === 'disconnect')) {
							txn();
						} else if (error) {
							result = onComplete ? onComplete(error, false, snapshot) : undefined;
							reject(error);
						} else {
							result = onComplete ? onComplete(error, committed && !aborted, snapshot) : undefined;
							resolve({committed: committed && !aborted, snapshot: snapshot});
						}
						return result;
					}, applyLocally);
				} catch (e) {
					if (onComplete) onComplete(e, false);
					reject(e);
				}
			}

			txn();
		});

		return promise;
	};
})();*/

//export function FirebaseConnect<T>(paths: string[]); // just disallow this atm, since you might as well just use a connect/getter func
/*export function FirebaseConnect<T>(pathsOrGetterFunc?: string[] | ((props: T)=>string[]));
export function FirebaseConnect<T>(pathsOrGetterFunc?) {
	return firebaseConnect(props=> {
		let paths =
			pathsOrGetterFunc instanceof Array ? pathsOrGetterFunc :
			pathsOrGetterFunc instanceof Function ? pathsOrGetterFunc(props) :
			[];
		paths = paths.map(a=>DBPath(a)); // add version prefix to paths
		return paths;
	});
}*/