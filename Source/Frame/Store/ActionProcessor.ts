import {GetTreeNodesInObjTree} from "../V/V";
import Action from "../General/Action";
import {ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedToggle, ACTViewCenterChange} from "../../Store/main/mapViews";
import {LoadURL_Globals, UpdateURL_Globals} from "../URL/URLManager";
import {GetPathL1} from "../../Store/router";
import {GetUrlVars} from "../General/Globals_Free";

let lastPath = "";
export function ProcessAction(action: Action<any>) {
	if (action.type == "@@INIT") {
		setTimeout(()=> {
			if (GetPathL1() == "global") {
				LoadURL_Globals();
			}
		});
	}

	if (action.type == "@@reactReduxFirebase/SET" && action["data"]) {
		// turn annoying arrays into objects
		var treeNodes = GetTreeNodesInObjTree(action["data"], true);
		for (let treeNode of treeNodes) {
			if (treeNode.Value instanceof Array) {
				let objVersion = {}.Extend(treeNode.Value) as any;
				for (let key in objVersion) {
					// if fake array-item added by Firebase (just so it would be an array), remove it
					if (objVersion[key] == null)
						delete objVersion[key];
				}
				treeNode.obj[treeNode.prop] = objVersion;
			}

			// add special _key or _id prop
			if (typeof treeNode.Value == "object") {
				let key = treeNode.prop == "_root" ? (action["path"] as string).split("/").Last() : treeNode.prop;
				if (parseInt(key).toString() == key) {
					treeNode.Value._id = parseInt(key);
					//treeNode.Value._Set("_id", parseInt(key));
				} else {
					treeNode.Value._key = key;
					//treeNode.Value._Set("_key", key);
				}
			}
		}

		// add special _key or _id prop
		/*if (typeof action["data"] == "object") {
			let key = (action["path"] as string).split("/").Last();
			if (parseInt(key).toString() == key)
				action["data"]._id = parseInt(key);
			else
				action["data"]._key = key;
		}*/
	}

	let movingToGlobals = false;
	if (action.type == "@@router/LOCATION_CHANGE") {
		if (!lastPath.startsWith("/global") && action.payload.pathname.startsWith("/global"))
			movingToGlobals = true;
		lastPath = action.payload.pathname;
	}
	if (movingToGlobals || action.IsAny(ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedToggle, ACTViewCenterChange)) {
		setTimeout(()=>UpdateURL_Globals());
	}
}