import {Assert} from "../../Frame/General/Assert";
import {createSelector} from "reselect";
import {MapNode, MetaThesis_ThenType} from "../../routes/@Shared/Maps/MapNode";
import {DBPath, GetData, RequestPaths} from "../../Frame/Database/DatabaseHelpers";
import {RootState} from "../Root";
import {Set} from "immutable";
import {firebaseConnect} from "react-redux-firebase";
import {CachedTransform} from "../../Frame/V/VCache";
import {RatingType} from "../../routes/@Shared/Maps/MapNode/RatingType";
import {MapNodeType} from "../../routes/@Shared/Maps/MapNodeType";
import {CalculateArgumentStrength} from "../../routes/@Shared/Maps/MapNode/RatingProcessor";
import {IsNaN} from "../../Frame/General/Types";

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
	//Assert(id != null && !IsNaN(id), "Node-id cannot be null or NaN.");
	if (id == null || IsNaN(id)) return null;
	return GetData(`nodes/${id}`) as MapNode;
}
export function GetParentNode(path: string) {
	return GetNode(path.split("/").map(a=>parseInt(a)).XFromLast(1));
}

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
		return (nodeChildren || {}).VKeys().Except("_key").Select(a=>parseInt(a));
	}
);

export function GetNodeChildren(node: MapNode) {
	let children = (node.children || {}).VKeys().Except("_key").map(id=>GetNode(parseInt(id)));
	return CachedTransform({nodeID: node._id}, children, ()=>children);
}

// ratings
// ==========

export type RatingsRoot = {[key: string]: RatingsSet};
export type RatingsSet = {[key: string]: Rating};
export type Rating = {_key: string, updated: number, value: number};
//export type RatingWithUserID = Rating & {userID: string};

export function GetPaths_NodeRatingsRoot(nodeID: number) {
	return [`nodeRatings/${nodeID}`];
}
export function GetNodeRatingsRoot(nodeID: number) {
	//RequestPaths(GetPaths_NodeRatingsRoot(nodeID));
	return GetData(GetPaths_NodeRatingsRoot(nodeID)[0]) as RatingsRoot;
}

export function GetRatingSet(nodeID: number, ratingType: RatingType) {
	let ratingsRoot = GetNodeRatingsRoot(nodeID);
	return ratingsRoot ? ratingsRoot[ratingType] : null;
}
export function GetRatings(nodeID: number, ratingType: RatingType): Rating[] {
	let ratingSet = GetRatingSet(nodeID, ratingType);
	return CachedTransform({nodeID, ratingType}, {ratingSet},
		()=>ratingSet ? ratingSet.Props.filter(a=>a.name != "_key").map(a=>a.value as Rating) : []);
}
export function GetRating(nodeID: number, ratingType: RatingType, userID: string) {
	let ratingSet = GetRatingSet(nodeID, ratingType);
	return ratingSet[userID];
}
export function GetRatingValue(nodeID: number, ratingType: RatingType, userID: string, resultIfNoData = null): number {
	let rating = GetRating(nodeID, ratingType, userID);
	return rating ? rating.value : resultIfNoData;
}
export function GetRatingAverage(nodeID: number, ratingType: RatingType, resultIfNoData = null): number {
	if (ratingType == "strength")
		return CalculateArgumentStrength(GetNodeChildren(GetNode(nodeID)));
	let ratings = GetRatings(nodeID, ratingType);
	if (ratings.length == 0) return resultIfNoData as any;
	return CachedTransform({nodeID, ratingType}, {ratings}, ()=>ratings.map(a=>a.value).Average().RoundTo(1));
}

/*export function GetPaths_MainRatingSet(node: MapNode) {
	let mainRatingType = MapNode.GetMainRatingTypes(node)[0];
	return [`nodeRatings/${node._id}/${mainRatingType}`];
}
export function GetPaths_MainRatingAverage(node: MapNode) {
	let result = GetPaths_MainRatingSet(node);
	if (node.type == MapNodeType.SupportingArgument || node.type == MapNodeType.OpposingArgument)
		result.AddRange(GetPaths_CalculateArgumentStrength(node, GetNodeChildren(node)));
	return result;
}*/
export function GetMainRatingAverage(node: MapNode, resultIfNoData = null): number {
	// if static category, always show full bar
	if (node._id < 100)
		return 100;
	return GetRatingAverage(node._id, MapNode.GetMainRatingTypes(node)[0], resultIfNoData);
}
//export function GetPaths_MainRatingFillPercent(node: MapNode) { return GetPaths_MainRatingAverage(node); }
export function GetMainRatingFillPercent(node: MapNode) {
	let mainRatingAverage = GetMainRatingAverage(node);
	if (node.metaThesis && (node.metaThesis_thenType == MetaThesis_ThenType.StrengthenParent || node.metaThesis_thenType == MetaThesis_ThenType.WeakenParent))
		return mainRatingAverage != null ? mainRatingAverage.Distance(50) * 2 : 0;
	return mainRatingAverage || 0;
}

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