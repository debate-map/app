import {RequestPath, Connect} from "./FirebaseConnect";
import {Assert} from "../General/Assert";
import {helpers, firebaseConnect} from "react-redux-firebase";
//import {DBPath as DBPath_} from "../../../config/DBVersion";
import {IsString} from "../General/Types";
import {FirebaseApplication, DataSnapshot} from "firebase";
import {BaseComponent} from "../UI/ReactGlobals";
import {GetTreeNodesInObjTree, DeepGet, DeepSet} from "../V/V";
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

Object.prototype._AddFunction_Inline = function Ref(path = "", inVersionRoot = true) {
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
		Ref(path?: string, inVersionRoot?: boolean): firebase.DatabaseReference,
	},
};

export function ProcessDBData(data, forceAsObjects: boolean, addHelpers: boolean, rootKey: string) {
	var treeNodes = GetTreeNodesInObjTree(data, true);
	for (let treeNode of treeNodes) {
		// turn annoying arrays into objects
		if (forceAsObjects && treeNode.Value instanceof Array) {
			let valueAsObject = {}.Extend(treeNode.Value) as any;
			for (let key in valueAsObject) {
				// if fake array-item added by Firebase/js (just so the array would have no holes), remove it
				//if (valueAsObject[key] == null)
				if (valueAsObject[key] === undefined)
					delete valueAsObject[key];
			}
			//treeNode.obj[treeNode.prop] = valueAsObject;
			// we need to use deep-set, because ancestor objects may have already changed during this transform/processing
			DeepSet(data, treeNode.PathStr_Updeep, valueAsObject);
		}

		// add special _key or _id prop
		if (addHelpers && typeof treeNode.Value == "object") {
			let key = treeNode.prop == "_root" ? rootKey : treeNode.prop;
			if (parseInt(key).toString() == key) {
				treeNode.Value._id = parseInt(key);
				//treeNode.Value._Set("_id", parseInt(key));
			} else {
				treeNode.Value._key = key;
				//treeNode.Value._Set("_key", key);
			}
		}
	}
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

class DBPathInfo {
	lastTimestamp = -1;
	cachedData;
}
let pathInfos = {} as {[path: string]: DBPathInfo};
g.Extend({GetData});
export function GetData(path: string, inVersionRoot = true, makeRequest = true) {
	let firebase = State().firebase;
	path = DBPath(path, inVersionRoot);

	let info = pathInfos[path] || (pathInfos[path] = new DBPathInfo());
	/*let timestampEntry = (firebase as any)._root.entries.FirstOrX(a=>a[0] == "timestamp");
	if (timestampEntry) {
		var timestamp = (firebase as any)._root ? timestampEntry[1].get(path) : null;*/
	let timestamps = firebase.get("timestamp");
	if (timestamps) {
		//var timestamp = firebase._root ? timestamps.get(path) : null;
		var timestamp = timestamps.has(path) ? timestamps.get(path) : null;
		if (timestamp && timestamp != info.lastTimestamp) {
			info.lastTimestamp = timestamp;
			info.cachedData = helpers.dataToJS(firebase, path);
		}
	}

	if (makeRequest)
		RequestPath(path);

	return info.cachedData;
}

g.Extend({GetDataAsync});
//export async function GetDataAsync(path: string, inVersionRoot = true, addHelpers = true, firebase: firebase.DatabaseReference = store.firebase.helpers.ref("")) {
export async function GetDataAsync(path: string, inVersionRoot = true, addHelpers = true) {
	let firebase = store.firebase.helpers;
	return await new Promise((resolve, reject) => {
		//firebase.child(DBPath(path, inVersionRoot)).once("value",
		firebase.Ref(path, inVersionRoot).once("value",
			(snapshot: DataSnapshot)=> {
				let result = snapshot.val();
				if (result)
					ProcessDBData(result, true, addHelpers, path.split("/").Last());
				resolve(result);
			},
			(ex: Error)=>reject(ex));
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