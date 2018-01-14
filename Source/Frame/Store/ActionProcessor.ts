import Action from "../General/Action";
import {ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedSet, ACTViewCenterChange} from "../../Store/main/mapViews/$mapView/rootNodeViews";
import {GetCurrentURL_SimplifiedForPageViewTracking, GetSyncLoadActionsForURL, LoadURL} from "../URL/URLManager";
import {VURL} from "js-vextensions";
import {ACTMapViewMerge} from "../../Store/main/mapViews/$mapView";
import {DBPath, GetData, GetDataAsync, ProcessDBData} from "../Database/DatabaseHelpers";
import {GetMapView, GetSelectedNodePath, GetFocusedNodePath, GetNodeView} from "../../Store/main/mapViews";
import {Vector2i} from "js-vextensions";
import {RootState} from "../../Store/index";
import ReactGA from "react-ga";
import {GetCurrentURL} from "../General/URLs";
import {CreateMapViewForPath} from "./PathFinder";
import {ACTNotificationMessageAdd, ACTSetPage, ACTSetSubpage} from "../../Store/main";
import NotificationMessage from "../../Store/main/@NotificationMessage";
import {GetNodeDisplayText} from "../../Store/firebase/nodes/$node";
import Raven from "raven-js";
import {ACTDebateMapSelect, ACTDebateMapSelect_WithData} from "../../Store/main/debates";
import {ACTTermSelect, ACTImageSelect} from "../../Store/main/database";
import {LOCATION_CHANGED} from "redux-little-router";
import {SplitStringBySlash_Cached} from "Frame/Database/StringSplitCache";
import {Map} from "../../Store/firebase/maps/@Map";
import {ACTPersonalMapSelect, ACTPersonalMapSelect_WithData} from "../../Store/main/personal";
import {ACTMap_PlayingTimelineStepSet, ACTMap_PlayingTimelineAppliedStepSet, GetPlayingTimelineCurrentStepRevealNodes} from "../../Store/main/maps/$map";
import {GetAsync} from "Frame/Database/DatabaseHelpers";
import {UpdateFocusNodeAndViewOffset} from "../../UI/@Shared/Maps/MapUI";
import {FindReact, FindDOM} from "react-vextensions";
import MapUI from "../../UI/@Shared/Maps/MapUI";
import {SleepAsync} from "js-vextensions";
import {GetNodeL2} from "Store/firebase/nodes/$node";

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
			action["data"] = ProcessDBData(action["data"], true, true, SplitStringBySlash_Cached(action["path"]).Last());

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

	/*if (g.actionStacks || (devEnv && !actionStacks_actionTypeIgnorePatterns.Any(a=>action.type.startsWith(a)))) {
		action["stack"] = new Error().stack.split("\n").slice(1); // add stack, so we can inspect in redux-devtools
	}*/
	
}
export function MidDispatchAction(action: Action<any>, newState: RootState) {
}

export function DoesURLChangeCountAsPageChange(oldURL: VURL, newURL: VURL, directURLChange: boolean) {
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
export function RecordPageView(url: VURL) {
	//let url = window.location.pathname;
	ReactGA.set({page: url.toString({domain: false})});
	ReactGA.pageview(url.toString({domain: false}) || "/");
	MaybeLog(a=>a.pageViews, ()=>"Page-view: " + url);
}

let postInitCalled = false;
let pageViewTracker_lastURL: VURL;
export async function PostDispatchAction(action: Action<any>) {
	if (!postInitCalled) {
		PostInit();
		postInitCalled = true;
	}

	let url = GetCurrentURL();
	//let oldURL = URL.Current();
	//let url = VURL.FromState(action.payload);
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
		if (!hasHotReloaded) {
			LoadURL(startURL.toString());
		}
		//UpdateURL(false);
		if (prodEnv && State("main", "analyticsEnabled")) {
			Log("Initialized Google Analytics.");
			//ReactGA.initialize("UA-21256330-33", {debug: true});
			ReactGA.initialize("UA-21256330-33");

			/*let url = VURL.FromState(State().router).toString(false);
			ReactGA.set({page: url});
			ReactGA.pageview(url || "/");*/
		}
	}
	// is triggered by back/forward navigation, as well things that call store.dispatch([push/replace]()) -- such as UpdateURL()
	if (action.type == LOCATION_CHANGED) {
		/*if (g.justChangedURLFromCode) {
			g.justChangedURLFromCode = false;
		} else {*/
		if (!(action as any).payload.byCode) {
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
	if (action.Is(ACTPersonalMapSelect) || action.Is(ACTDebateMapSelect)) {
		let map = action.payload.id ? await GetDataAsync("maps", action.payload.id) as Map : null;
		let actionType = action.Is(ACTPersonalMapSelect) ? ACTPersonalMapSelect_WithData : ACTDebateMapSelect_WithData;
		store.dispatch(new actionType({id: action.payload.id, map}));

		if (map) {
			let pathsToExpand = [""+map.rootNode];
			for (var depth = 0; depth < map.defaultExpandDepth; depth++) {
				let newPathsToExpand = [];
				for (let path of pathsToExpand) {
					let nodeID = path.split("/").Last().ToInt();
					let node = await GetAsync(()=>GetNodeL2(nodeID));
					if (GetNodeView(map._id, path) == null) {
						store.dispatch(new ACTMapNodeExpandedSet({mapID: map._id, path, expanded: true, recursive: false}));
					}
					if (node.children) {
						newPathsToExpand.push(...node.children.VKeys(true).map(childID=>path + "/" + childID));
					}
				}
				pathsToExpand = newPathsToExpand;
			}
		}
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
		let joinDate = await GetDataAsync("userExtras", userID, "joinDate");
		if (joinDate == null) {
			let firebase = store.firebase.helpers;
			firebase.DBRef(`userExtras/${userID}`).update({
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

	if (action.Is(ACTMap_PlayingTimelineStepSet) || action.Is(ACTMap_PlayingTimelineAppliedStepSet)) {
		let newlyRevealedNodes = await GetAsync(()=>GetPlayingTimelineCurrentStepRevealNodes(action.payload.mapID));
		//stats=>Log("Requested paths:\n==========\n" + stats.requestedPaths.VKeys().join("\n") + "\n\n"));
		ExpandToAndFocusOnNodes(action.payload.mapID, newlyRevealedNodes);
	}
}

async function ExpandToAndFocusOnNodes(mapID: number, paths: string[]) {
	for (let path of paths) {
		let parentPath = path.split("/").slice(0, -1).join("/");
		store.dispatch(new ACTMapNodeExpandedSet({mapID, path: parentPath, expanded: true, recursive: false}));
	}

	for (var i = 0; i < 30 && $(".MapUI").length == 0; i++) { await SleepAsync(100); }
	let mapUIEl = $(".MapUI");
	if (mapUIEl.length == 0) return;
	let mapUI = FindReact(mapUIEl[0]) as MapUI;
	
	for (var i = 0; i < 30 && paths.map(path=>mapUI.FindNodeBox(path)).Any(a=>a == null); i++) { await SleepAsync(100); }
	let nodeBoxes = paths.map(path=>mapUI.FindNodeBox(path)).filter(a=>a != null);
	if (nodeBoxes.length == 0) return;

	let nodeBoxPositionSum = new Vector2i(0, 0);
	for (let box of nodeBoxes) {
		let boxPos = $(FindDOM(box)).GetScreenRect().Center.Minus(mapUIEl.GetScreenRect().Position);
		nodeBoxPositionSum = nodeBoxPositionSum.Plus(boxPos);
	}
	let nodeBoxPositionAverage = nodeBoxPositionSum.Times(1 / paths.length);
	//mapUI.ScrollToPosition(new Vector2i((nodeBoxPositionAverage.x - 100).KeepAtLeast(0), nodeBoxPositionAverage.y));
	mapUI.ScrollToPosition(nodeBoxPositionAverage.Plus(-250, 0));
	UpdateFocusNodeAndViewOffset(mapID);
}

function PostInit() {
	let lastAuth;
	//Log("Subscribed");
	store.subscribe(()=> {
		let auth = State().firebase.auth;
		if (auth && auth != lastAuth) {
			//Log("Setting user-context: " + auth);
			//Raven.setUserContext(auth);
			Raven.setUserContext(auth.Including("uid", "displayName", "email", "photoURL"));
			lastAuth = auth;
		}
	});
}