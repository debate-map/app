import {Assert, GetPropsChanged_WithValues, GetPropsChanged, GetStackTraceStr} from "js-vextensions";
import {RootState, ApplyActionSet} from "../../Store/index";
import {connect} from "react-redux";
import {ShallowChanged, GetInnerComp} from "react-vextensions";
import {watchEvents, unWatchEvents} from "react-redux-firebase/lib/actions/query";
import {getEventsFromInput} from "react-redux-firebase/lib/utils";
import { TryCall, Timer } from "js-vextensions";
import { SplitStringBySlash_Cached } from "Frame/Database/StringSplitCache";
import {GetUser, GetUserPermissionGroups} from "../../Store/firebase/users";
import {GetUserID} from "Store/firebase/users";
import { activeStoreAccessCollectors } from "Frame/Database/DatabaseHelpers";
import Action from "../General/Action";
import Moment from "moment";

// Place a selector in Connect() whenever it uses data that:
// 1) might change during the component's lifetime, and:
// 2) is not already used by an existing selector in Connect()
// This way, it'll correctly trigger a re-render when the underlying data changes.

/*export function Connect<T, P>(getterFunc: (state: RootState, props: P)=>any) {
	return (innerClass: new(...args)=>T) => {
		class FirebaseConnect extends Component {
			// [...]
			render () {
				return (
					<innerClass
						{...this.props}
						{...this.state}
						firebase={this.firebase}
					/>
				)
			}
		}
		return FirebaseConnect;
	}
}*/

G({FirebaseConnect: Connect}); // make global, for firebase-forum
// if you're sending in a connect-func rather than a connect-func-wrapper, then you need to make it have at least one argument (to mark it as such)
export function Connect<T, P>(innerMapStateToPropsFunc: (state: RootState, props: P)=>any);
export function Connect<T, P>(mapStateToProps_inner_getter: ()=>(state: RootState, props: P)=>any);
export function Connect<T, P>(funcOrFuncGetter) {
	let mapStateToProps_inner: (state: RootState, props: P)=>any, mapStateToProps_inner_getter: ()=>(state: RootState, props: P)=>any;
	let isFuncGetter = funcOrFuncGetter.length == 0; //&& typeof TryCall(funcOrFuncGetter) == "function";
	if (!isFuncGetter) mapStateToProps_inner = funcOrFuncGetter;
	else mapStateToProps_inner_getter = funcOrFuncGetter;

	let mapStateToProps_wrapper = function(state: RootState, props: P) {
		let s = this;
		g.inConnectFunc = true;

		//if (ShouldLog(a=>a.check_callStackDepths)) {
		/*if (devEnv) {
			let callStackDepth = GetStackTraceStr().split("\n").length;
			// if we're at a call-stack-depth of X, we know something's wrong, so break
			Assert(callStackDepth < 1000, `Call-stack-depth too deep (${callStackDepth})! Something must be wrong with the UI code.`);
		}*/
		
		ClearRequestedPaths();
		ClearAccessedPaths();
		//Assert(GetAccessedPaths().length == 0, "Accessed-path must be empty at start of mapStateToProps call (ie. the code in Connect()).");
		//let firebase = state.firebase;
		//let firebase = props["firebase"];
		let firebase = store.firebase;

		let changedPath = null;
		let storeDataChanged = false;
		if (s.lastAccessedStorePaths_withData == null) {
			storeDataChanged = true;
		} else {
			for (let path in s.lastAccessedStorePaths_withData) {
				if (State({countAsAccess: false}, path) !== s.lastAccessedStorePaths_withData[path]) {
					//store.dispatch({type: "Data changed!" + path});
					storeDataChanged = true;
					changedPath = path;
					if (changedPath.includes("bot_currentNodeID")) debugger;
					break;
				}
			}
		}

		//let propsChanged = ShallowChanged(props, s.lastProps || {});
		//let propsChanged = ShallowChanged(props, s.lastProps || {}, "children");
		let changedProps = GetPropsChanged(s.lastProps, props, false);

		//let result = storeDataChanged ? mapStateToProps_inner(state, props) : s.lastResult;
		if (!storeDataChanged && changedProps.length == 0) {
			g.inConnectFunc = false;
			return s.lastResult;
		}

		if (logTypes.renderTriggers) {
			s.extraInfo = s.extraInfo || {};
			let CreateRenderTriggerArray = ()=>[].VAct(a=>Object.defineProperty(a, "$Clear", {get: ()=>s.extraInfo.recentRenderTriggers = CreateRenderTriggerArray()}));
			let recentRenderTriggers = s.extraInfo.recentRenderTriggers as any[] || CreateRenderTriggerArray();
			let renderTrigger = {
				propChanges: GetPropsChanged_WithValues(s.lastProps, props),
				storeChanges: GetPropsChanged_WithValues(s.lastAccessedStorePaths_withData, (s.lastAccessedStorePaths_withData || {}).VKeys().ToMap(key=>key, key=>State(key))),
				time: Moment().format("HH:mm:ss"),
			};
			// add new entries to start, and trim old ones from end
			recentRenderTriggers.splice(0, 0, renderTrigger);
			if (recentRenderTriggers.length > 100) {
				recentRenderTriggers.splice(-1, 1);
			}
			s.extraInfo.recentRenderTriggers = recentRenderTriggers;
		}

		// for debugging in profiler
		/*if (__DEV__) {
			//let debugText = ToJSON(props).replace(/[^a-zA-Z0-9]/g, "_");
			let debugText = `${props["node"] ? " @ID:" + props["node"]._id : ""} @changedPath: ${changedPath} @changedProps: ${changedProps.join(", ")}`;
			let wrapperFunc = eval(`(function ${debugText.replace(/[^a-zA-Z0-9]/g, "_")}() { return mapStateToProps_inner.apply(s, arguments); })`);
			var result = wrapperFunc.call(s, state, props);
		} else*/ {
			var result = mapStateToProps_inner.call(s, state, props);
		}

		// also access some other paths here, so that when they change, they trigger ui updates for everything
		result._user = GetUser(GetUserID());
		result._permissions = GetUserPermissionGroups(GetUserID());
		result._extraInfo = s.extraInfo;

		let oldRequestedPaths: string[] = s.lastRequestedPaths || [];
		let requestedPaths: string[] = GetRequestedPaths();
		//if (firebase._ && ShallowChanged(requestedPaths, oldRequestedPaths)) {
		if (ShallowChanged(requestedPaths, oldRequestedPaths)) {
			setImmediate(()=> {
				s._firebaseEvents = getEventsFromInput(requestedPaths);
				let removedPaths = oldRequestedPaths.Except(...requestedPaths);
				// todo: find correct way of unwatching events; the way below seems to sometimes unwatch while still needed watched
				// for now, we just never unwatch
				//unWatchEvents(firebase, DispatchDBAction, getEventsFromInput(removedPaths));
				let addedPaths = requestedPaths.Except(...oldRequestedPaths);
				watchEvents(firebase, DispatchDBAction, getEventsFromInput(addedPaths));
				// for debugging, you can check currently-watched-paths using: store.firebase._.watchers
			});
			s.lastRequestedPaths = requestedPaths;
		}

		let accessedStorePaths: string[] = GetAccessedPaths();
		//ClearAccessedPaths();
		s.lastAccessedStorePaths_withData = {};
		for (let path of accessedStorePaths) {
			s.lastAccessedStorePaths_withData[path] = State({countAsAccess: false}, path);
		}
		s.lastProps = props;
		s.lastResult = result;

		g.inConnectFunc = false;

		return result;
	};

	if (mapStateToProps_inner) {
		return connect(mapStateToProps_wrapper, null, null, {withRef: true}); // {withRef: true} lets you do wrapperComp.getWrappedInstance() 
	}
	return connect(()=> {
		mapStateToProps_inner = mapStateToProps_inner_getter();
		return mapStateToProps_wrapper;
	}, null, null, {withRef: true});
}

let actionTypeBufferInfos = {
	"@@reactReduxFirebase/START": {time: 300},
	"@@reactReduxFirebase/SET": {time: 300},
};
let actionTypeLastDispatchTimes = {};
let actionTypeBufferedActions = {};

function DispatchDBAction(action) {
	let timeSinceLastDispatch = Date.now() - (actionTypeLastDispatchTimes[action.type] || 0);
	let bufferInfo = actionTypeBufferInfos[action.type];

	// if we're not supposed to buffer this action type, or it's been long enough since last dispatch of this type
	if (bufferInfo == null || timeSinceLastDispatch >= bufferInfo.time) {
		// dispatch action right away
		store.dispatch(action);
		actionTypeLastDispatchTimes[action.type] = Date.now();
	}
	// else, buffer action to be dispatched later
	else {
		// if timer not started, start it now
		if (actionTypeBufferedActions[action.type] == null) {
			setTimeout(()=> {
				// now that wait is over, apply any buffered event-triggers
				store.dispatch(new ApplyActionSet(actionTypeBufferedActions[action.type]));

				actionTypeLastDispatchTimes[action.type] = Date.now();
				actionTypeBufferedActions[action.type] = null;
			}, (actionTypeLastDispatchTimes[action.type] + bufferInfo.time) - Date.now());
		}

		// add action to buffer, to be run when timer ends
		actionTypeBufferedActions[action.type] = (actionTypeBufferedActions[action.type] || []).concat(action);
	}
}

let requestedPaths = {} as {[key: string]: boolean};
/** This only adds paths to a "request list". Connect() is in charge of making the actual db requests. */
export function RequestPath(path: string) {
	MaybeLog(a=>a.dbRequests, ()=>"Requesting db-path (stage 1): " + path);
	requestedPaths[path] = true;
}
/** This only adds paths to a "request list". Connect() is in charge of making the actual db requests. */
export function RequestPaths(paths: string[]) {
	for (let path of paths) {
		RequestPath(path);
	}
}
export function ClearRequestedPaths() {
	requestedPaths = {};
}
export function GetRequestedPaths() {
	return requestedPaths.VKeys();
}

let accessedStorePaths = {} as {[key: string]: boolean};
export function OnAccessPath(path: string) {
	//Log("Accessing-path Stage1: " + path);
	//let path = pathSegments.join("/");
	accessedStorePaths[path] = true;
	if (activeStoreAccessCollectors) {
		for (let collector of activeStoreAccessCollectors) {
			collector.storePathsRequested.push(path);
		}
	}
}
/*export function OnAccessPaths(paths: string[]) {
	for (let path of paths)
		OnAccessPath(path);
}*/
export function ClearAccessedPaths() {
	accessedStorePaths = {};
}
export function GetAccessedPaths() {
	//Log("GetAccessedPaths:" + accessedStorePaths.VKeys());
	return accessedStorePaths.VKeys();
}