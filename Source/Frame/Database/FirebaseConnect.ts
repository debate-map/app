import {Assert} from "../General/Assert";
import {RootState} from "../../Store/index";
import {connect} from "react-redux";
import {ShallowChanged} from "../UI/ReactGlobals";
import {watchEvents, unWatchEvents} from "react-redux-firebase/dist/actions/query";
import {getEventsFromInput} from "react-redux-firebase/dist/utils";
import {Log} from "../Serialization/VDF/VDF";
import {ToJSON} from "../General/Globals";

// note: you only need to use selectors in Connect() when they might request db-paths
//		the rest of the time, you can just use the selector directly (inside the comp)

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

export function Connect<T, P>(innerConnectFunc: (state: RootState, props: P)=>any);
export function Connect<T, P>(innerConnectFuncWrapper: ()=>(state: RootState, props: P)=>any);
export function Connect<T, P>(funcOrFuncWrapper) {
	let innerConnectFunc: (state: RootState, props: P)=>any, innerConnectFuncWrapper: ()=>(state: RootState, props: P)=>any;
	/*if (funcOrFuncWrapper.length) innerConnectFunc = funcOrFuncWrapper;
	else innerConnectFuncWrapper = funcOrFuncWrapper;*/
	if (funcOrFuncWrapper.length || typeof funcOrFuncWrapper() != "function") innerConnectFunc = funcOrFuncWrapper;
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

		//Assert(s != null);
		let requestedPaths = GetRequestedPaths();
		if (firebase._ && ShallowChanged(requestedPaths, s.lastRequestedPaths || [])) {
			setTimeout(()=> {
				if (s._firebaseEvents)
					unWatchEvents(firebase, store.dispatch, s._firebaseEvents)
				s._firebaseEvents = getEventsFromInput(requestedPaths);
				watchEvents(firebase, store.dispatch, s._firebaseEvents);
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