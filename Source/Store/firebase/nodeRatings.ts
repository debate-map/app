import {GetArgumentStrengthPseudoRating, GetArgumentStrengthPseudoRatingSet} from "../../Frame/Store/RatingProcessor";
import {RatingType} from "../../Store/firebase/nodeRatings/@RatingType";
import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {CachedTransform} from "../../Frame/V/VCache";
import {MapNode} from "../../Store/firebase/nodes/@MapNode";
import {RatingsRoot, Rating} from "./nodeRatings/@RatingsRoot";
import {GetNodeChildren, GetNode} from "./nodes";
import {MetaThesis_ThenType} from "./nodes/@MetaThesisInfo";
import {ThesisForm} from "./nodes/@MapNode";

export function GetNodeRatingsRoot(nodeID: number) {
	//RequestPaths(GetPaths_NodeRatingsRoot(nodeID));
	return GetData(`nodeRatings/${nodeID}`) as RatingsRoot;
}

export function GetRatingSet(nodeID: number, ratingType: RatingType) {
	if (ratingType == "strength") {
		let node = GetNode(nodeID);
		return GetArgumentStrengthPseudoRatingSet(node, GetNodeChildren(node));
	}
	let ratingsRoot = GetNodeRatingsRoot(nodeID);
	return ratingsRoot ? ratingsRoot[ratingType] : null;
}
//export function GetRatings(nodeID: number, ratingType: RatingType, thesisForm?: ThesisForm): Rating[] {
export function GetRatings(nodeID: number, ratingType: RatingType): Rating[] {
	let ratingSet = GetRatingSet(nodeID, ratingType);
	/*return CachedTransform("GetRatings", {nodeID, ratingType}, {ratingSet}, ()=> {
		if (ratingSet == null) return [];
		let result = ratingSet.VValues();
	});*/
	return CachedTransform("GetRatings", {nodeID, ratingType}, {ratingSet}, ()=>ratingSet ? ratingSet.VValues(true) : []);
}
export function GetRating(nodeID: number, ratingType: RatingType, userID: string) {
	let ratingSet = GetRatingSet(nodeID, ratingType);
	if (ratingSet == null) return null;
	return ratingSet[userID];
}
export function GetRatingValue(nodeID: number, ratingType: RatingType, userID: string, resultIfNoData = null): number {
	let rating = GetRating(nodeID, ratingType, userID);
	return rating ? rating.value : resultIfNoData;
}
export function GetRatingAverage(nodeID: number, ratingType: RatingType, ratings?: Rating[], resultIfNoData = null): number {
	// if static category, always show full bar
	if (nodeID < 100)
		return 100;
	ratings = ratings || GetRatings(nodeID, ratingType);
	if (ratings.length == 0) return resultIfNoData as any;
	return CachedTransform("GetRatingAverage", {nodeID, ratingType}, {ratings}, ()=>ratings.map(a=>a.value).Average().RoundTo(1));
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

/** Returns an int from 0 to 100. */
/*export function GetMainRatingAverage(node: MapNode, resultIfNoData = null): number {
	// if static category, always show full bar
	if (node._id < 100)
		return 100;
	return GetRatingAverage(node._id, MapNode.GetMainRatingTypes(node)[0], resultIfNoData);
}*/

/** Returns an int from 0 to 100. */
/*export function GetMainRatingFillPercent(node: MapNode) {
	let mainRatingAverage = GetMainRatingAverage(node);
	if (node.metaThesis && (node.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || node.metaThesis.thenType == MetaThesis_ThenType.WeakenParent))
		return mainRatingAverage != null ? mainRatingAverage.Distance(50) * 2 : 0;
	return mainRatingAverage || 0;
}*/
export function GetFillPercentForRatingAverage(node: MapNode, ratingAverage: number, thesisForm?: ThesisForm) {
	if (node.metaThesis && (node.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || node.metaThesis.thenType == MetaThesis_ThenType.WeakenParent))
		return ratingAverage != null ? ratingAverage.Distance(50) * 2 : 0;
	return GetRatingForForm(ratingAverage || 0, thesisForm);
}
export function GetRatingForForm(ratingValue: number, thesisForm: ThesisForm) {
	if (thesisForm == ThesisForm.Negation)
		return 100 - ratingValue;
	return ratingValue;
}