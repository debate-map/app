import {GetTreeNodesInObjTree} from "../V/V";
import Action from "../General/Action";
import {ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedSet, ACTViewCenterChange} from "../../Store/main/mapViews/$mapView/rootNodeViews";
import {LoadURL_Globals, UpdateURL_Globals} from "../URL/URLManager";
import {GetPathNodes, GetPath} from "../../Store/router";
import {GetUrlVars} from "../General/Globals_Free";
import {ACTMapViewMerge} from "../../Store/main/mapViews/$mapView";
import {GetData, DBPath} from "../Database/DatabaseHelpers";
import {GetMapView} from "../../Store/main/mapViews";
import {Vector2i} from "../General/VectorStructs";
import {RootState} from "../../Store/index";
import {ACTOpenMapSet} from "../../Store/main";

let lastPath = "";
//export function ProcessAction(action: Action<any>, newState: RootState, oldState: RootState) {
export function ProcessAction(action: Action<any>) {
	//if (action.type == "@@INIT") {
	if (action.type == "persist/REHYDRATE" || action.type == "@@router/LOCATION_CHANGE") {
		setTimeout(()=> {
			if (GetPath().startsWith("global/map")) {
				store.dispatch(new ACTOpenMapSet(1));
				if (action.type == "persist/REHYDRATE")
					LoadURL_Globals();
				//setTimeout(()=>UpdateURL_Globals());
				// we don't yet have a good way of knowing when loading is fully done; so just do a timeout
				setTimeout(UpdateURL_Globals, 200);
				setTimeout(UpdateURL_Globals, 400);
				setTimeout(UpdateURL_Globals, 800);
				setTimeout(UpdateURL_Globals, 1600);
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

		/*let match = action["path"].match("^" + DBPath("maps") + "/([0-9]+)");
		// if map-data was just loaded
		if (match) {
			let mapID = parseInt(match[1]);
			// and no map-view exists for it yet, create one (by expanding root-node, and changing focus-node/view-offset)
			//if (GetMapView(mapID) == null) {
			if (GetMapView(mapID).rootNodeViews.VKeys().length == 0) {
				setTimeout(()=> {
					store.dispatch(new ACTMapNodeExpandedSet({mapID, path: action["data"].rootNode.toString(), expanded: true, recursive: false}));
					store.dispatch(new ACTViewCenterChange({mapID, focusNode: action["data"].rootNode.toString(), viewOffset: new Vector2i(200, 0)}));
				});
			}
		}*/
	}

	/*let movingToGlobals = false;
	if (action.type == "@@router/LOCATION_CHANGE") {
		if (!lastPath.startsWith("/global") && action.payload.pathname.startsWith("/global"))
			movingToGlobals = true;
		lastPath = action.payload.pathname;
	}
	if (movingToGlobals || action.IsAny(ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedSet, ACTViewCenterChange)) {
		setTimeout(()=>UpdateURL_Globals());
	}*/
	if (action.IsAny(ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedSet, ACTViewCenterChange)) {
		setTimeout(()=>UpdateURL_Globals());
	}
}