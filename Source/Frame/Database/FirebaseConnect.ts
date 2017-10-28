import {Assert} from "../General/Assert";
import {RootState} from "../../Store/index";
import {connect} from "react-redux";
import {ShallowChanged, GetInnerComp} from "../UI/ReactGlobals";
import {watchEvents, unWatchEvents} from "react-redux-firebase/dist/actions/query";
import {getEventsFromInput} from "react-redux-firebase/dist/utils";
import {ToJSON} from "../General/Globals";
import { TryCall, Timer } from "../General/Timers";
import { SplitStringBySlash_Cached } from "Frame/Database/StringSplitCache";
import {GetUser, GetUserPermissionGroups} from "../../Store/firebase/users";
import {GetUserID} from "Store/firebase/users";

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
				if (State({countAsAccess: false}, ...SplitStringBySlash_Cached(path)) !== s.lastAccessedStorePaths_withData[path]) {
					//store.dispatch({type: "Data changed!" + path});
					storeDataChanged = true;
					changedPath = path;
					break;
				}
			}
		}
		//let propsChanged = ShallowChanged(props, s.lastProps || {});
		let propsChanged = ShallowChanged(props, s.lastProps || {}, "children");

		//let result = storeDataChanged ? mapStateToProps_inner(state, props) : s.lastResult;
		if (!storeDataChanged && !propsChanged) {
			g.inConnectFunc = false;
			return s.lastResult;
		}
		//let result = mapStateToProps_inner.call(s, state, props);
		// for debugging in profiler
		//let debugText = ToJSON(props).replace(/[^a-zA-Z0-9]/g, "_");
		let debugText = (props["node"] ? " @ID:" + props["node"]._id : "") + " @changedPath: " + changedPath;
		let wrapperFunc = eval(`(function ${debugText.replace(/[^a-zA-Z0-9]/g, "_")}() { return mapStateToProps_inner.apply(s, arguments); })`);
		let result = wrapperFunc.call(s, state, props);

		// also access some other paths here, so that when they change, they trigger ui updates for everything
		result._user = GetUser(GetUserID());
		result._permissions = GetUserPermissionGroups(GetUserID());

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
			s.lastAccessedStorePaths_withData[path] = State({countAsAccess: false}, ...SplitStringBySlash_Cached(path));
		}
		s.lastProps = props;
		s.lastResult = result;

		g.inConnectFunc = false;

		return result;
	};

	if (mapStateToProps_inner)
		return connect(mapStateToProps_wrapper);
	return connect(()=> {
		mapStateToProps_inner = mapStateToProps_inner_getter();
		return mapStateToProps_wrapper;
	});
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
				let combinedAction = {type: "ApplyActionSet", actions: actionTypeBufferedActions[action.type]} as any;
				store.dispatch(combinedAction);

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
	//Log("Requesting Stage1: " + path);
	requestedPaths[path] = true;
}
/** This only adds paths to a "request list". Connect() is in charge of making the actual db requests. */
export function RequestPaths(paths: string[]) {
	for (let path of paths)
		RequestPath(path);
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