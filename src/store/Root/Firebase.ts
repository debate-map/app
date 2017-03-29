import {createSelector} from "reselect";
import {MapNode} from "../../routes/@Shared/Maps/MapNode";
import {DBPath, GetData} from "../../Frame/Database/DatabaseHelpers";
import {RootState} from "../Root";
import {Set} from "immutable";
import {firebaseConnect} from "react-redux-firebase";

//export function FirebaseConnect<T>(paths: string[]); // just disallow this atm, since you might as well just use a connect/getter func
export function FirebaseConnect<T>(pathsGetterFunc: (props: T)=>string[]);
export function FirebaseConnect<T>(pathsOrGetterFunc) {
	return firebaseConnect(props=> {
		let paths = pathsOrGetterFunc instanceof Array ? pathsOrGetterFunc : pathsOrGetterFunc(props);
		paths = paths.map(a=>DBPath(a)); // add version prefix to paths
		return paths;
	});
}

/*export function GetAuth(state: RootState) { 
	return state.firebase.auth;
}*/

export function GetUserID(): string {
	//return state.firebase.data.auth ? state.firebase.data.auth.uid : null;
	//return GetData(state.firebase, "auth");
	/*var result = helpers.pathToJS(firebase, "auth").uid;
	return result;*/
	/*let firebaseSet = State().firebase as Set<any>;
	return firebaseSet.toJS().auth.uid;*/
	return State().firebase.get("auth") ? State().firebase.get("auth").uid : null;
}
export function GetUserPermissionGroups_Path(userID: string) {
	return `userExtras/${userID}/permissionGroups`;
}
export function GetUserPermissionGroups(userID: string) {
	return GetData(GetUserPermissionGroups_Path(userID));
}

//export function GetNode_Path() {}
export function GetNode(id: number) {
	return GetData(`nodes/${id}`) as MapNode;
}
export function GetParentNode(path: string) {
	return GetNode(path.split("/").map(a=>parseInt(a)).XFromLast(1));
}

export type RatingsRoot = {[key: string]: RatingsSet};
export type RatingsSet = {[key: string]: Rating};
export type Rating = {updated: number, value: number};

export function GetPaths_NodeRatingsRoot({node}: {node: MapNode}) {
	return [`nodeRatings/${node._id}`];
}
export const GetNodeRatingsRoot = ({firebase}: RootState, {node}: {node: MapNode})=>GetData(GetPaths_NodeRatingsRoot({node})[0]);

/*export function GetPaths_NodeRatings({node, ratingType}: {node: MapNode, ratingType: RatingType}) {
	return [`nodeRatings/${node._id}/${ratingType}`];
}
export const MakeGetNodeRatings = ()=>createSelector(
	()=>({firebase}: RootState, {node, ratingType}: {node: MapNode, ratingType: RatingType})=>GetData(firebase, GetPaths_NodeRatings({node, ratingType})[0]),
	ratingRoot=> {
		return ratingRoot ? ratingRoot.Props.Where(a=>a.name != "_id").Select(a=>a.value) : [];
	}
);*/

export var MakeGetNodeChildIDs = ()=>createSelector(
	(_, {node}: {node: MapNode})=>node.children,
	nodeChildren=> {
		return (nodeChildren || {}).VKeys().Select(a=>parseInt(a));
	}
);

/*export function MakeGetNodeChildren() {
	var getNodeChildIDs = MakeGetNodeChildIDs();
	return createSelector(
		({firebase})=>firebase,
		getNodeChildIDs,
		(firebase, childIDs)=> {
			if (firebase == null) debugger;
			return childIDs.Select(a=>GetData(firebase, `nodes/${a}`)).Where(a=>a);
		}
	);
}*/
/*export function MakeGetNodeChildren() {
	var getNodeChildIDs = MakeGetNodeChildIDs();
	return createSelector(
		getNodeChildIDs,
		childIDs=> {
			let firebase = store.getState().firebase;
			if (firebase == null) debugger;
			return childIDs.Select(a=>GetData(firebase, `nodes/${a}`)).Where(a=>a);
		}
	);
}*/