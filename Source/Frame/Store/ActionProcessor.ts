import {GetNodeAsync} from "../../Store/firebase/nodes";
import {GetTreeNodesInObjTree} from "../V/V";
import Action from "../General/Action";
import {ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedSet, ACTViewCenterChange} from "../../Store/main/mapViews/$mapView/rootNodeViews";
import {LoadURL, UpdateURL} from "../URL/URLManager";
import {ACTMapViewMerge} from "../../Store/main/mapViews/$mapView";
import {DBPath, GetData, GetDataAsync, ProcessDBData} from "../Database/DatabaseHelpers";
import {GetMapView} from "../../Store/main/mapViews";
import {Vector2i} from "../General/VectorStructs";
import {RootState} from "../../Store/index";
import ReactGA from "react-ga";
import {URL} from "../General/URLs";
import {Log} from "../Serialization/VDF/VDF";
import {replace} from "react-router-redux";
import {CreateMapViewForPath, GetShortestPathFromRootToNode} from "./PathFinder";
import {ACTNotificationMessageAdd} from "../../Store/main";
import NotificationMessage from "../../Store/main/@NotificationMessage";
import {GetNodeDisplayText} from "../../Store/firebase/nodes/@MapNode";

// use this to intercept dispatches (for debugging)
/*let oldDispatch = store.dispatch;
store.dispatch = function(...args) {
	if (GetTimeSinceLoad() > 5)
		debugger;
	oldDispatch.apply(this, args);
};*/

let lastPath = "";
//export function ProcessAction(action: Action<any>, newState: RootState, oldState: RootState) {
// only use this if you actually need to change the action-data before it gets dispatched/applied (otherwise use [Mid/Post]DispatchAction)
export function PreDispatchAction(action: Action<any>) {
	if (action.type == "@@reactReduxFirebase/SET" && action["data"]) {
		ProcessDBData(action["data"], true, true, (action["path"] as string).split("/").Last());

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
}

export function MidDispatchAction(action: Action<any>, newState: RootState) {
}

export async function PostDispatchAction(action: Action<any>) {
	//if (action.type == "@@INIT") {
	//if (action.type == "persist/REHYDRATE" && GetPath().startsWith("global/map"))
	if (action.type == "persist/REHYDRATE") {
		store.dispatch({type: "PostRehydrate"}); // todo: ms this also gets triggered when there is no saved-state (ie, first load)
	}
	if (action.type == "PostRehydrate") {
		LoadURL(startURL.toString());
		UpdateURL();
		if (prodEnv && State().main.analyticsEnabled) {
			Log("Initialized Google Analytics.");
			//ReactGA.initialize("UA-21256330-33", {debug: true});
			ReactGA.initialize("UA-21256330-33");

			/*let url = URL.FromState(State().router.location).toString(false);
			ReactGA.set({page: url});
			ReactGA.pageview(url || "/");*/
		}
	}
	if (action.type == "@@router/LOCATION_CHANGE") {
		//let oldURL = URL.Current();
		let url = URL.FromState(action.payload);
		//let url = window.location.pathname;
		ReactGA.set({page: url.toString(false)});
		ReactGA.pageview(url.toString(false) || "/");
		//Log("Page-view: " + url);

		//setTimeout(()=>UpdateURL());
		UpdateURL();
		if (url.WithImpliedPathNodes().toString(false).startsWith("/global/map")) {
			if (isBot) {
				/*let newURL = url.Clone();
				let node = await GetNodeAsync(nodeID);
				let node = await GetNodeAsync(nodeID);
				newURL.pathNodes[1] = "";
				store.dispatch(replace(newURL.toString(false)));*/
			} else {
				// we don't yet have a good way of knowing when loading is fully done; so just do a timeout
				WaitXThenRun(0, UpdateURL, 200);
				WaitXThenRun(0, UpdateURL, 400);
				WaitXThenRun(0, UpdateURL, 800);
				WaitXThenRun(0, UpdateURL, 1600);
			}
		}
		// If user followed search-result link (eg. "debatemap.live/global/156"), we only know the node-id.
		// Search for the shortest path from the map's root to this node, and update the view and url to that path.
		//if (url.pathNodes[0] == "global" && url.pathNodes[1] != null && url.pathNodes[1].match(/^[0-9]+$/) && !isBot) {
		if (url.toString(false).match(/^\/global\/[0-9]+$/) && !isBot) {
			let nodeID = parseInt(url.pathNodes[1]);
			let node = await GetNodeAsync(nodeID);
			if (node) {
				let shortestPathToNode = await GetShortestPathFromRootToNode(1, node);
				if (shortestPathToNode) {
					let mapViewForPath = CreateMapViewForPath(shortestPathToNode);
					//Log(`Found shortest path (${shortestPathToNode}), so merging: ` + ToJSON(mapViewForPath));
					store.dispatch(new ACTMapViewMerge({mapID: 1, mapView: mapViewForPath}));
				} else {
					store.dispatch(new ACTNotificationMessageAdd(new NotificationMessage(
						`Could not find a path to the node specified in the url (#${nodeID}, title: "${GetNodeDisplayText(node)}").`)));
				}
			} else {
				store.dispatch(new ACTNotificationMessageAdd(new NotificationMessage(`The node specified in the url (#${nodeID}) was not found.`)));
			}

			let newURL = url.Clone();
			newURL.pathNodes.RemoveAt(1);
			store.dispatch(replace(newURL.toString(false)));
		}
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
		UpdateURL();
	}

	if (action.type == "@@reactReduxFirebase/LOGIN") {
		let userID = action["auth"].uid;
		let joinDate = await GetDataAsync(`userExtras/${userID}/joinDate`);
		if (joinDate == null) {
			let firebase = store.firebase.helpers;
			firebase.Ref(`userExtras/${userID}`).update({
				permissionGroups: {basic: true, verified: true, mod: false, admin: false},
				joinDate: Date.now(),
			});
		}
	}
}