import {Assert} from "../General/Assert";
import {RootState} from "../../Store/index";
import {connect} from "react-redux";
import {ShallowChanged} from "../UI/ReactGlobals";
import {watchEvents, unWatchEvents} from "react-redux-firebase/dist/actions/query";
import {getEventsFromInput} from "react-redux-firebase/dist/utils";
import {Log} from "../Serialization/VDF/VDF";
import {ToJSON} from "../General/Globals";
import {TryCall} from "../General/Timers";

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

/*export function Connect<T, P>(innerConnectFunc: (state: RootState, props: P)=>any, isFuncWrapper?: boolean);
export function Connect<T, P>(innerConnectFuncWrapper: ()=>(state: RootState, props: P)=>any, isFuncWrapper?: boolean);
export function Connect<T, P>(funcOrFuncWrapper, isConnectFuncWrapper = null) {*/

// if you're sending in a connect-func rather than a connect-func-wrapper, then you need to make it have at least one argument (to mark it as such)
export function Connect<T, P>(innerConnectFunc: (state: RootState, props: P)=>any);
export function Connect<T, P>(innerConnectFuncWrapper: ()=>(state: RootState, props: P)=>any);
export function Connect<T, P>(funcOrFuncWrapper) {
	let innerConnectFunc: (state: RootState, props: P)=>any, innerConnectFuncWrapper: ()=>(state: RootState, props: P)=>any;
	/*if (funcOrFuncWrapper.length) innerConnectFunc = funcOrFuncWrapper;
	else innerConnectFuncWrapper = funcOrFuncWrapper;*/
	//if (isConnectFuncWrapper === null)
	let isConnectFuncWrapper = funcOrFuncWrapper.length == 0; //&& typeof TryCall(funcOrFuncWrapper) == "function";
	if (!isConnectFuncWrapper) innerConnectFunc = funcOrFuncWrapper;
	else innerConnectFuncWrapper = funcOrFuncWrapper;

	//return connect((state: RootState, props: P)=> {
	//return connect(function(state: RootState, props: P) {
	let ourConnectFunc = function(state: RootState, props: P) {
		let s = this;
		ClearRequestedPaths();
		//let firebase = state.firebase;
		//let firebase = props["firebase"];
		let firebase = store.firebase;

		let result = innerConnectFunc(state, props);

		let oldRequestedPaths = s.lastRequestedPaths || [];
		let requestedPaths = GetRequestedPaths();
		if (firebase._ && ShallowChanged(requestedPaths, oldRequestedPaths)) {
			setImmediate(()=> {
				s._firebaseEvents = getEventsFromInput(requestedPaths);
				let removedPaths = oldRequestedPaths.Except(...requestedPaths);
				unWatchEvents(firebase, store.dispatch, getEventsFromInput(removedPaths));
				let addedPaths = requestedPaths.Except(...oldRequestedPaths);
				watchEvents(firebase, store.dispatch, getEventsFromInput(addedPaths));
			});
			s.lastRequestedPaths = requestedPaths;
			//Log("Requesting:" + ToJSON(requestedPaths) + "\n2:" + ToJSON(s._firebaseEvents)); 
		}

		return result;
	};

	if (innerConnectFunc)
		return connect(ourConnectFunc);
	return connect(()=> {
		innerConnectFunc = innerConnectFuncWrapper();
		return ourConnectFunc;
	});
}

/*let requestedPaths = [] as string[];
export function RequestPath(path: string) {
	requestedPaths.push(path);
}
export function RequestPaths(paths: string[]) {
	requestedPaths.push(...paths);
}
export function GetRequestedPathsAndClear() {
	var result = requestedPaths;
	requestedPaths = [];
	return result;
}*/

let requestedPaths = {} as {[key: string]: boolean};
export function RequestPath(path: string) {
	requestedPaths[path] = true;
}
export function RequestPaths(paths: string[]) {
	for (let path of paths)
		RequestPath(path);
}
/*export function GetRequestedPathsAndClear() {
	var result = requestedPaths.VKeys();
	requestedPaths = {};
	return result;
}*/
export function ClearRequestedPaths() {
	requestedPaths = {};
}
export function GetRequestedPaths() {
	return requestedPaths.VKeys();
}