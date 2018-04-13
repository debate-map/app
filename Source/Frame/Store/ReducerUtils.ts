import {combineReducers} from "redux";
import Action from "../General/Action";
import {emptyEntities} from "js-vextensions";

export function CombineReducers(reducerMap: {[key: string]: (state, action: Action<any>)=>any});
export function CombineReducers(getInitialState: ()=>any, reducerMap: {[key: string]: (state, action: Action<any>)=>any});
export function CombineReducers(...args) {
	let getInitialState, reducerMap;
	if (args.length == 1) [reducerMap] = args;
	else [getInitialState, reducerMap] = args;

	if (getInitialState) {
		let reducer = combineReducers(reducerMap);
		return (state = getInitialState(), action)=> {
		//return (state = getInitialState().VAct(a=>Object.setPrototypeOf(a, Object.getPrototypeOf({}))), action)=> {
		//return (state, action)=> {
			/*state = state || getInitialState().VAct(a=>Object.setPrototypeOf(a, Object.getPrototypeOf({})));
			Assert(Object.getPrototypeOf(state) == Object.getPrototypeOf({}));*/
			// combineReducers is picky; it requires it be passed a plain object; thus, we oblige ;-(
			Object.setPrototypeOf(state, Object.getPrototypeOf({}));
			return reducer(state, action);
		};
	}
	return combineReducers(reducerMap);
}

// use a singleton for empty-obj and empty-array (that way VCache and other shallow-compare systems work with them)
export const emptyObj = {};
export const emptyArray = [];
export const emptyArray_forLoading = []; // this one causes the "..." to show for node-children which are loading
export function IsSpecialEmptyArray<T>(array: Array<T>) {
	return array == emptyArray || array == emptyArray_forLoading;
}
// use the same empty-entities in js-vextensions
emptyEntities.VSet({emptyObj, emptyArray, emptyArray_forLoading});