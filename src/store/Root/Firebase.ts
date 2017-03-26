import {createSelector} from "reselect";
import {MapNode} from "../../routes/@Shared/Maps/MapNode";
import {DBPath, GetData} from "../../Frame/Database/DatabaseHelpers";
import {RootState} from "../Root";
import {Set} from "immutable";

/*export function GetAuth(state: RootState) { 
	return state.firebase.auth;
}*/

export function GetUserID(state: RootState): string { 
	//return state.firebase.data.auth ? state.firebase.data.auth.uid : null;
	//return GetData(state.firebase, "auth");
	/*var result = helpers.pathToJS(firebase, "auth").uid;
	return result;*/
	let firebaseSet = store.getState().firebase as Set<any>;
	return firebaseSet.toJS().auth.uid;
}

//export function GetNode_Path() {}
export function GetNode(id: number) {
	return GetData(State().firebase, `nodes/${id}`);
}

export type RatingsRoot = {[key: string]: RatingsSet};
export type RatingsSet = {[key: string]: Rating};
export type Rating = {updated: number, value: number};

export function GetPaths_NodeRatingsRoot({node}: {node: MapNode}) {
	return [DBPath(`nodeRatings/${node._id}`)];
}
export const GetNodeRatingsRoot = ({firebase}: RootState, {node}: {node: MapNode})=>GetData(firebase, GetPaths_NodeRatingsRoot({node})[0]);

/*export function GetPaths_NodeRatings({node, ratingType}: {node: MapNode, ratingType: RatingType}) {
	return [DBPath(`nodeRatings/${node._id}/${ratingType}`)];
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