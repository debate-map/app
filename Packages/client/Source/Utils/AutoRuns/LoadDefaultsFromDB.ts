/*import {GetSystemAccessPolicyID} from "dm_common";
import {store} from "Store/index.js";
import {RunInAction} from "web-vcore";
import {AutoRun_HandleBail} from "./@Helpers.js";

AutoRun_HandleBail(()=>{
	if (store.main.lastAccessPolicy == null) {
		(async()=>{
			const defaultPolicyID = GetSystemAccessPolicyID("Public, ungoverned (standard)");
			RunInAction("LoadDefaultsFromDB_action", ()=>{
				store.main.lastAccessPolicy = defaultPolicyID;
			});
		})();
	}
}, {name: "LoadDefaultsFromDB"});*/