import {GetTreeNodesInObjTree} from "../Frame/V/V";
import Action from "../Frame/General/Action";
import {ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedToggle, ACTViewCenterChange} from "./Root/Main/MapViews";
import {UpdateURL_Globals} from "../Frame/URL/URLManager";

let lastPath = "";
export function ProcessAction(action: Action<any>) {
	// cheats
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
				if (parseInt(key).toString() == key)
					treeNode.Value._id = parseInt(key);
				else
					treeNode.Value._key = key;
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