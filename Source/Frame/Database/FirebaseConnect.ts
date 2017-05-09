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
		ClearRequestedPaths();
		//let firebase = state.firebase;
		//let firebase = props["firebase"];
		let firebase = store.firebase;

		let result = mapStateToProps_inner(state, props);

		let oldRequestedPaths: string[] = s.lastRequestedPaths || [];
		let requestedPaths: string[] = GetRequestedPaths();
		if (firebase._ && ShallowChanged(requestedPaths, oldRequestedPaths)) {
			setImmediate(()=> {
				/*for (let path of requestedPaths)
					Log("Requesting Stage2: " + path);*/

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

	if (mapStateToProps_inner)
		return connect(mapStateToProps_wrapper);
	return connect(()=> {
		mapStateToProps_inner = mapStateToProps_inner_getter();
		return mapStateToProps_wrapper;
	});
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