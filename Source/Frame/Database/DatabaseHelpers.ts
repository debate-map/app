import {RequestPath} from "./FirebaseConnect";
import {Assert} from "../General/Assert";
import {FirebaseDatabase} from "../UI/ReactGlobals";
import {helpers, firebaseConnect} from "react-redux-firebase";
import {DBPath as DBPath_} from "../../../config/DBVersion";
import {IsString} from "../General/Types";
//export {DBPath};

export function DBPath(path = "") {
	Assert(path != null, "Path cannot be null.");
	Assert(IsString(path), "Path must be a string.");
	return DBPath_(path);
}

//interface Object { Ref: ()=>firebase.Database; }
declare global { class FirebaseDatabase_Extensions {
	Ref: (path?: string)=>firebase.DatabaseReference;
}}
Object.prototype._AddFunction_Inline = function Ref(path = "") {
	let finalPath = DBPath(path);
	return this.ref(finalPath);
}

class DBPathInfo {
	lastTimestamp = -1;
	cachedData;
}
let pathInfos = {} as {[path: string]: DBPathInfo};
export function GetData(path: string, makeRequest = true) {
	let firebase = State().firebase;
	path = DBPath(path);

	let info = pathInfos[path] || (pathInfos[path] = new DBPathInfo());
	/*let timestampEntry = (firebase as any)._root.entries.FirstOrX(a=>a[0] == "timestamp");
	if (timestampEntry) {
		var timestamp = (firebase as any)._root ? timestampEntry[1].get(path) : null;*/
	let timestamps = firebase.get("timestamp");
	if (timestamps) {
		var timestamp = firebase._root ? timestamps.get(path) : null;
		if (timestamp && timestamp != info.lastTimestamp) {
			info.lastTimestamp = timestamp;
			info.cachedData = helpers.dataToJS(firebase, path);
		}
	}

	if (makeRequest)
		RequestPath(path);

	return info.cachedData;
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
export function FirebaseConnect<T>(pathsOrGetterFunc?: string[] | ((props: T)=>string[]));
export function FirebaseConnect<T>(pathsOrGetterFunc?) {
	return firebaseConnect(props=> {
		let paths =
			pathsOrGetterFunc instanceof Array ? pathsOrGetterFunc :
			pathsOrGetterFunc instanceof Function ? pathsOrGetterFunc(props) :
			[];
		paths = paths.map(a=>DBPath(a)); // add version prefix to paths
		return paths;
	});
}