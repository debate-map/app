import {GetNodeAsync} from "../../Store/firebase/nodes";
import {GetTreeNodesInObjTree} from "../V/V";
import Action from "../General/Action";
import {ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedSet, ACTViewCenterChange} from "../../Store/main/mapViews/$mapView/rootNodeViews";
import {LoadURL, GetSyncLoadActionsForURL} from "../URL/URLManager";
import {ACTMapViewMerge} from "../../Store/main/mapViews/$mapView";
import {DBPath, GetData, GetDataAsync, ProcessDBData} from "../Database/DatabaseHelpers";
import { GetMapView, GetSelectedNodePath, GetFocusedNodePath } from "../../Store/main/mapViews";
import {Vector2i} from "../General/VectorStructs";
import {RootState} from "../../Store/index";
import * as ReactGA from "react-ga";
import {URL, CurrentUrl, GetCurrentURL} from "../General/URLs";
import {CreateMapViewForPath, GetShortestPathFromRootToNode} from "./PathFinder";
import {ACTNotificationMessageAdd, ACTSetPage, ACTSetSubpage} from "../../Store/main";
import NotificationMessage from "../../Store/main/@NotificationMessage";
import {GetNodeDisplayText} from "../../Store/firebase/nodes/$node";
import * as Raven from "raven-js";
import {ACTDebateMapSelect, ACTDebateMapSelect_WithData} from "../../Store/main/debates";
import {ACTTermSelect, ACTImageSelect} from "../../Store/main/content";
import {LOCATION_CHANGED} from "redux-little-router";
import {GetCurrentURL_SimplifiedForPageViewTracking} from "../../UI/@Shared/Maps/MapNode/NodeUI_ForBots";

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
	if (action.type == "@@reactReduxFirebase/SET") {
		if (action["data"]) {
			action["data"] = ProcessDBData(action["data"], true, true, (action["path"] as string).split("/").Last());

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
		} else {
			// don't add the property to the store, if it is just null anyway (this makes it consistent with how firebase returns the whole db-state)
			delete action["data"];
		}
	}

	if (g.actionStacks || (devEnv && !actionStacks_actionTypeIgnorePatterns.Any(a=>action.type.startsWith(a)))) {
		action["stack"] = new Error().stack.split("\n").slice(1); // add stack, so we can inspect in redux-devtools
	}
}
const actionStacks_actionTypeIgnorePatterns = [
	"@@reactReduxFirebase/", // ignore redux actions
];

export function MidDispatchAction(action: Action<any>, newState: RootState) {
}

export function DoesURLChangeCountAsPageChange(oldURL: URL, newURL: URL, directURLChange: boolean) {
	if (oldURL == null) return true;
	if (oldURL.PathStr() != newURL.PathStr()) return true;

	let oldSyncLoadActions = GetSyncLoadActionsForURL(oldURL, directURLChange);
	let oldMapViewMergeAction = oldSyncLoadActions.find(a=>a.Is(ACTMapViewMerge));
	
	let newSyncLoadActions = GetSyncLoadActionsForURL(newURL, directURLChange);
	let newMapViewMergeAction = newSyncLoadActions.find(a=>a.Is(ACTMapViewMerge));

	let oldViewStr = oldURL.GetQueryVar("view");
	let oldURLWasTemp = oldViewStr == "";
	if (newMapViewMergeAction != oldMapViewMergeAction && !oldURLWasTemp) {
		//let oldFocused = GetFocusedNodePath(GetMapView(mapViewMergeAction.payload.mapID));
		let oldFocused = oldMapViewMergeAction ? GetFocusedNodePath(oldMapViewMergeAction.payload.mapView) : null;
		let newFocused = newMapViewMergeAction ? GetFocusedNodePath(newMapViewMergeAction.payload.mapView) : null;
		if (newFocused != oldFocused) return true;
	}
	return false;
}
export function RecordPageView(url: URL) {
	//let url = window.location.pathname;
	ReactGA.set({page: url.toString({domain: false})});
	ReactGA.pageview(url.toString({domain: false}) || "/");
	MaybeLog(a=>a.pageViews, ()=>"Page-view: " + url);
}

let postInitCalled = false;
let pageViewTracker_lastURL: URL;
export async function PostDispatchAction(action: Action<any>) {
	if (!postInitCalled) {
		PostInit();
		postInitCalled = true;
	}

	let url = GetCurrentURL();
	//let oldURL = URL.Current();
	//let url = URL.FromState(action.payload);
	let simpleURL = GetCurrentURL_SimplifiedForPageViewTracking();
	if (DoesURLChangeCountAsPageChange(pageViewTracker_lastURL, simpleURL, true)) {
		pageViewTracker_lastURL = simpleURL;
		RecordPageView(simpleURL);
	}

	//if (action.type == "@@INIT") {
	//if (action.type == "persist/REHYDRATE" && GetPath().startsWith("global/map"))
	if (action.type == "persist/REHYDRATE") {
		store.dispatch({type: "PostRehydrate"}); // todo: ms this also gets triggered when there is no saved-state (ie, first load)
	}
	if (action.type == "PostRehydrate") {
		LoadURL(startURL.toString());
		//UpdateURL(false);
		if (prodEnv && State(a=>a.main.analyticsEnabled)) {
			Log("Initialized Google Analytics.");
			//ReactGA.initialize("UA-21256330-33", {debug: true});
			ReactGA.initialize("UA-21256330-33");

			/*let url = URL.FromState(State().router).toString(false);
			ReactGA.set({page: url});
			ReactGA.pageview(url || "/");*/
		}
	}
	// is triggered by back/forward navigation, as well things that call store.dispatch([push/replace]()) -- such as UpdateURL()
	if (action.type == LOCATION_CHANGED) {
		if (g.justChangedURLFromCode) {
			g.justChangedURLFromCode = false;
		} else {
			//setTimeout(()=>UpdateURL());
			await LoadURL(url.toString());
			//UpdateURL(false);
			if (url.toString({domain: false}).startsWith("/global/map")) {
				if (isBot) {
					/*let newURL = url.Clone();
					let node = await GetNodeAsync(nodeID);
					let node = await GetNodeAsync(nodeID);
					newURL.pathNodes[1] = "";
					store.dispatch(replace(newURL.toString(false)));*/
				} else {
					// we don't yet have a good way of knowing when loading is fully done; so just do a timeout
					/*WaitXThenRun(0, UpdateURL, 200);
					WaitXThenRun(0, UpdateURL, 400);
					WaitXThenRun(0, UpdateURL, 800);
					WaitXThenRun(0, UpdateURL, 1600);*/
				}
			}
		}
	}
	if (action.Is(ACTDebateMapSelect)) {
		let rootNodeID = await GetDataAsync(`maps/${action.payload.id}/rootNode`) as number;
		store.dispatch(new ACTDebateMapSelect_WithData({id: action.payload.id, rootNodeID}))
	}

	/*let movingToGlobals = false;
	if (action.type == LOCATION_CHANGED) {
		if (!lastPath.startsWith("/global") && action.payload.pathname.startsWith("/global"))
			movingToGlobals = true;
		lastPath = action.payload.pathname;
	}
	if (movingToGlobals || action.IsAny(ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedSet, ACTViewCenterChange)) {
		setTimeout(()=>UpdateURL_Globals());
	}*/
	/*let pushURL_actions = [
		ACTSetPage, ACTSetSubpage, // general
		ACTTermSelect, ACTImageSelect, // content
		//ACTDebateMapSelect, // debates
		ACTDebateMapSelect_WithData, // debates
	];
	let replaceURL_actions = [
		ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedSet, ACTViewCenterChange, // global
	];
	let isPushURLAction = action.IsAny(...pushURL_actions);
	let isReplaceURLAction = action.IsAny(...replaceURL_actions);
	if (isPushURLAction || isReplaceURLAction) {
		UpdateURL(isPushURLAction && !action["fromURL"]);
	}*/

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

		//Raven.setUserContext(action["auth"].Including("uid", "displayName", "email"));
	} /*else if (action.type == "@@reactReduxFirebase/LOGOUT") {
		Raven.setUserContext();
	}*/

	/*if (action.type == "@@reactReduxFirebase/SET" && action["data"] == null) {
		// remove the property from the store, if it is just null anyway (this makes it consistent with how firebase returns the whole db-state)
	}*/

	/*if (action.Is(ACTViewCenterChange) || action.Is(ACTMapNodeSelect)) {
		let simpleURL = GetSimpleURLForCurrentMapView();
		RecordPageView(simpleURL);
	}*/
}

function PostInit() {
	let lastAuth;
	//Log("Subscribed");
	store.subscribe(()=> {
		let auth = State(a=>a.firebase.auth, null, false);
		if (auth && auth != lastAuth) {
			//Log("Setting user-context: " + auth);
			//Raven.setUserContext(auth);
			Raven.setUserContext(auth.Including("uid", "displayName", "email", "photoURL"));
			lastAuth = auth;
		}
	});
}