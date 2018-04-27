import { CachedTransform_WithStore } from "Frame/Database/DatabaseHelpers";
import { Lerp } from "js-vextensions";
import { GetData } from "../../Frame/Database/DatabaseHelpers";
import { GetArgumentImpactPseudoRatingSet } from "../../Frame/Store/RatingProcessor";
import { emptyObj } from "../../Frame/Store/ReducerUtils";
import { RatingType, ratingTypes } from "../../Store/firebase/nodeRatings/@RatingType";
import { WeightingType } from "../main";
import { Rating, RatingsRoot } from "./nodeRatings/@RatingsRoot";
import { RS_GetAllValues } from "./nodeRatings/ReasonScore";
import { GetNodeChildrenL2 } from "./nodes";
import { GetMainRatingType, GetNodeL2 } from "./nodes/$node";
import { ClaimForm, MapNodeL3 } from "./nodes/@MapNode";
import { MapNodeType } from "./nodes/@MapNodeType";
import { GetUserID } from "./users";
import {HolderType} from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolderBox";

export function GetNodeRatingsRoot(nodeID: number) {
	//RequestPaths(GetPaths_NodeRatingsRoot(nodeID));
	return GetData("nodeRatings", nodeID) as RatingsRoot;
}

// path is needed if you want 
export function GetRatingSet(nodeID: number, ratingType: RatingType, path?: string) {
	if (ratingType == "impact") {
		let node = GetNodeL2(nodeID);
		if (node == null) return null;
		let nodeChildren = GetNodeChildrenL2(node);
		if (nodeChildren.Any(a=>a == null)) return emptyObj;
		let premises = nodeChildren.filter(a=>a == null || a.type == MapNodeType.Claim);
		return GetArgumentImpactPseudoRatingSet(node, premises);
	}
	let ratingsRoot = GetNodeRatingsRoot(nodeID);
	return ratingsRoot ? ratingsRoot[ratingType] : null;
}
//export function GetRatings(nodeID: number, ratingType: RatingType, thesisForm?: ThesisForm): Rating[] {
export function GetRatings(nodeID: number, ratingType: RatingType, filter?: RatingFilter): Rating[] {
	/*let ratingSet = GetRatingSet(nodeID, ratingType, null);
	return CachedTransform("GetRatings", [nodeID, ratingType].concat((filter || {}).VValues()), {ratingSet},
		()=>ratingSet ? FilterRatings(ratingSet.VValues(true), filter) : []);*/
	
	return CachedTransform_WithStore("GetRatings", [nodeID, ratingType].concat((filter || {}).VValues()), {}, ()=> {
		let ratingSet = GetRatingSet(nodeID, ratingType, null);
		if (ratingSet == null) return [];
		return FilterRatings(ratingSet.VValues(true), filter);
	});
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
export function GetRatingAverage(nodeID: number, ratingType: RatingType, filter?: RatingFilter, resultIfNoData = null): number {
	// if voting disabled, always show full bar
	/*let node = GetNodeL2(nodeID);
	if (node && node.current.votingDisabled) return 100;

	let ratings = GetRatings(nodeID, ratingType, filter);
	if (ratings.length == 0) return resultIfNoData as any;
	return CachedTransform("GetRatingAverage", [nodeID, ratingType].concat((filter || {}).VValues()), {ratings},
		()=>ratings.map(a=>a.value).Average().RoundTo(1));*/
	return CachedTransform_WithStore("GetRatingAverage", [nodeID, ratingType, resultIfNoData].concat((filter || {}).VValues()), {}, ()=> {
		let node = GetNodeL2(nodeID);
		if (node && node.current.votingDisabled) return 100;

		let ratings = GetRatings(nodeID, ratingType, filter);
		if (ratings.length == 0) return resultIfNoData as any;
		return ratings.map(a=>a.value).Average().RoundTo(1);
	});
}
export function GetRatingAverage_AtPath(node: MapNodeL3, ratingType: RatingType, filter?: RatingFilter, resultIfNoData = null): number {
	let result = GetRatingAverage(node._id, ratingType, filter, resultIfNoData);
	if (ShouldRatingTypeBeReversed(node, ratingType)) {
		result = 100 - result;
	}
	return result;
}

export function GetFillPercent_AtPath(node: MapNodeL3, path: string, boxType?: HolderType, ratingType?: RatingType, filter?: RatingFilter, resultIfNoData = null): number {
	ratingType = ratingType || {[HolderType.Truth]: "truth", [HolderType.Relevance]: "relevance"}[boxType] as any || GetMainRatingType(node);
	if (State(a=>a.main.weighting) == WeightingType.Votes) {
		return GetRatingAverage_AtPath(node, ratingType, filter, resultIfNoData);
	}

	let {argTruthScoreComposite, argWeightMultiplier, claimTruthScore} = RS_GetAllValues(node, path);
	
	//if (State(a=>a.main.weighting) == WeightingType.ReasonScore) {
	if (node.type == MapNodeType.Claim) {
		return claimTruthScore * 100;
	} else if (node.type == MapNodeType.Argument) {
		if (boxType == HolderType.Relevance) {
			//return Lerp(0, 100, GetPercentFromXToY(0, 2, argWeightMultiplier));
			return Lerp(0, 100, argWeightMultiplier);
		}
		return argTruthScoreComposite * 100;
	}
}
export function GetMarkerPercent_AtPath(node: MapNodeL3, path: string, boxType?: HolderType, ratingType?: RatingType) {
	ratingType = ratingType || {[HolderType.Truth]: "truth", [HolderType.Relevance]: "relevance"}[boxType] as any || GetMainRatingType(node);
	if (State(a=>a.main.weighting) == WeightingType.Votes) {
		return GetRatingAverage_AtPath(node, ratingType, new RatingFilter({includeUser: GetUserID()}));
	}
}

/*export function GetPaths_MainRatingSet(node: MapNode) {
	let mainRatingType = MapNode.GetMainRatingTypes(node)[0];
	return [`nodeRatings/${node._id}/${mainRatingType}`];
}
export function GetPaths_MainRatingAverage(node: MapNode) {
	let result = GetPaths_MainRatingSet(node);
	if (node.type == MapNodeType.Argument || node.type == MapNodeType.Argument)
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
	if (node.current.impactPremise && (node.current.impactPremise.thenType == ImpactPremise_ThenType.StrengthenParent || node.current.impactPremise.thenType == ImpactPremise_ThenType.WeakenParent))
		return mainRatingAverage != null ? mainRatingAverage.Distance(50) * 2 : 0;
	return mainRatingAverage || 0;
}*/

/*export function GetFillPercentForRatingAverage(node: MapNode, ratingAverage: number, reverseRating?: boolean) {
	ratingAverage = TransformRatingForContext(ratingAverage, reverseRating);
	/*if (node.current.impactPremise && (node.current.impactPremise.thenType == ImpactPremise_ThenType.StrengthenParent || node.current.impactPremise.thenType == ImpactPremise_ThenType.WeakenParent))
		return ratingAverage != null ? ratingAverage.Distance(50) * 2 : 0;*#/
	return ratingAverage || 0;
}
export function TransformRatingForContext(ratingValue: number, reverseRating: boolean) {
	if (ratingValue == null) return null;
	if (reverseRating) return 100 - ratingValue;
	return ratingValue;
}*/

export class RatingFilter {
	constructor(initialData: Partial<RatingFilter>) {
		this.Extend(initialData);
	}

	includeUser = null as string;
}
export function FilterRatings(ratings: Rating[], filter: RatingFilter) {
	return ratings.filter(a=>filter == null || filter.includeUser == a._key);
}

export function TransformRatingForContext(ratingValue: number, reverseRating: boolean) {
	if (ratingValue == null) return null;
	if (reverseRating) return 100 - ratingValue;
	return ratingValue;
}
/*export function GetFillPercentForRatingType(node: MapNodeL3, path: string, ratingType: RatingType, filter?: RatingFilter) {
	if (ratingType == "impact") {
		let nodeChildren = GetNodeChildrenL3(node, path);
		//let nodeChildren = GetNodeChildrenL2(node).map(child=>AsNodeL3(child, Polarity.Supporting, GetLinkUnderParent(child._id, node)));
		if (nodeChildren.Any(a=>a == null)) return 0;
		let premises = nodeChildren.filter(a=>a.type == MapNodeType.Claim);
		let averageTruth = premises.map(premise=>GetRatingAverage_AtPath(premise, "truth", filter, null)).Average();
		//Log(`Node: ${node._id} @averageTruth: ${averageTruth}`);

		let averageRelevance = GetRatingAverage(node._id, "relevance", filter);

		return ((averageTruth / 100) * (averageRelevance / 100)) * 100;
	}
	
	return GetRatingAverage_AtPath(node, ratingType, filter) || 0;
}*/

/*export function ShouldRatingTypeBeReversed(ratingType: RatingType, nodeReversed: boolean, contextReversed: boolean) {
	//return nodeReversed || (contextReversed && ratingType == "adjustment");
	return nodeReversed;
}*/
export function ShouldRatingTypeBeReversed(node: MapNodeL3, ratingType: RatingType) {
	//return node.type == MapNodeType.Argument && node.finalPolarity != node.link.polarity;
	//if (["impact", "relevance"].Contains(ratingType)) return false;
	return node.link.form == ClaimForm.Negation;
}