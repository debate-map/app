import {Lerp, emptyObj, ToJSON, Assert, IsNumber, CE, emptyArray_forLoading, CreateStringEnum, emptyArray} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, CreateAccessor, GetDocs, NoID} from "web-vcore/nm/mobx-graphlink.js";
import {observable} from "web-vcore/nm/mobx.js";
import {Validate} from "web-vcore/nm/mobx-graphlink.js";
import {NodeRatingType, RatingType_Info} from "./nodeRatings/@NodeRatingType.js";
import {NodeRating, NodeRating_MaybePseudo as NodeRating_MaybePseudo} from "./nodeRatings/@NodeRating.js";
import {RS_GetAllValues} from "./nodeRatings/ReasonScore.js";
import {GetNodeChildrenL2, HolderType} from "./nodes.js";
import {GetMainRatingType, GetNodeL2} from "./nodes/$node.js";
import {ClaimForm, MapNodeL3} from "./nodes/@MapNode.js";
import {MapNodeType} from "./nodes/@MapNodeType.js";
import {MeID} from "./users.js";
import {GetAccessPolicy} from "./accessPolicies.js";
import {GetArgumentImpactPseudoRatings} from "../Utils/DB/RatingProcessor.js";

export const GetRatings = CreateAccessor(c=><
	((nodeID: string, ratingType: Exclude<NodeRatingType, "impact">|n, userID?: string|n)=>NodeRating[]) & // if rating-type is known to not be "impact", all results will be "true ratings"
	((nodeID: string, ratingType: NodeRatingType|n, userID?: string|n)=>NodeRating_MaybePseudo[]) // else, some results may lack the "id" field
>((nodeID: string, ratingType: NodeRatingType|n, userID?: string|n): NodeRating_MaybePseudo[]=>{
	if (ratingType == "impact") {
		const node = GetNodeL2(nodeID);
		if (node === undefined) return emptyArray_forLoading;
		if (node === null) return emptyArray;
		const nodeChildren = GetNodeChildrenL2(nodeID);
		const premises = nodeChildren.filter(a=>a == null || a.type == MapNodeType.claim);
		return GetArgumentImpactPseudoRatings(node, premises);
	}
	
	/*const ratings = GetRatings(nodeID, ratingType);
	if (ratingSet == null) return [];
	return FilterRatings(CE(ratingSet).VValues(), filter);
	//return FilterRatings(Array.from(ratingSet.values()), filter);*/

	return GetDocs({
		params: {filter: {
			node: {equalTo: nodeID},
			type: {equalTo: ratingType},
			user: userID && {equalTo: userID},
		}}
	}, a=>a.nodeRatings);
}));
export const GetRating = CreateAccessor(c=>(nodeID: string, ratingType: NodeRatingType, userID: string)=>{
	return GetRatings(nodeID, ratingType, userID)[0];
});
export const GetRatingValue = CreateAccessor(c=><T>(nodeID: string, ratingType: NodeRatingType, userID: string, resultIfNoData?: T): number|T=>{
	const rating = GetRating(nodeID, ratingType, userID);
	return rating ? rating.value : resultIfNoData as T;
});
export const GetRatingAverage = CreateAccessor(c=>(nodeID: string, ratingType: NodeRatingType, userID?: string|n): number|null=>{
	// return CachedTransform_WithStore('GetRatingAverage', [nodeID, ratingType, resultIfNoData].concat((filter || {}).VValues()), {}, () => {
	// if voting disabled, always show full bar
	/* let node = GetNodeL2(nodeID);
	if (node && node.current.votingDisabled) return 100;

	let ratings = GetRatings(nodeID, ratingType, filter);
	if (ratings.length == 0) return resultIfNoData as any; */

	const node = GetNodeL2(nodeID);
	if (node && !node.policy.permissions_base.vote) return 100;

	const ratings = GetRatings(nodeID, ratingType, userID);
	if (ratings.length == 0) return null;
	const result = CE(CE(ratings.map(a=>a.value)).Average()).RoundTo(1);
	Assert(result >= 0 && result <= 100, `Rating-average (${result}) not in range. Invalid ratings: ${ToJSON(ratings.map(a=>a.value).filter(a=>!IsNumber(a)))}`);
	return result;
});
export const GetRatingAverage_AtPath = CreateAccessor(c=><T>(node: MapNodeL3, ratingType: NodeRatingType, userID?: string|n, resultIfNoData?: T): number|T=>{
	let result = GetRatingAverage(node.id, ratingType, userID);
	if (result == null) return resultIfNoData as T;
	if (ShouldRatingTypeBeReversed(node, ratingType)) {
		result = 100 - result;
	}
	return result;
});

export enum WeightingType {
	votes = "votes",
	reasonScore = "reasonScore",
}

function HolderTypeToRatingType(holderType: HolderType|n) {
	return {
		[HolderType.truth]: NodeRatingType.truth,
		[HolderType.relevance]: NodeRatingType.relevance
	}[holderType!] as any;
}

const rsCompatibleNodeTypes = [MapNodeType.argument, MapNodeType.claim];
// export const GetFillPercent_AtPath = StoreAccessor('GetFillPercent_AtPath', (node: MapNodeL3, path: string, boxType?: HolderType, ratingType?: RatingType, filter?: RatingFilter, resultIfNoData = null) => {
export const GetFillPercent_AtPath = CreateAccessor(c=>(node: MapNodeL3, path: string, boxType?: HolderType, ratingType?: NodeRatingType, weighting = WeightingType.votes, userID?: string, resultIfNoData = null)=>{
	ratingType = ratingType ?? HolderTypeToRatingType(boxType) ?? GetMainRatingType(node);
	if (ratingType == null) return resultIfNoData;
	if (weighting == WeightingType.votes || !rsCompatibleNodeTypes?.includes(node.type)) {
		const result = GetRatingAverage_AtPath(node, ratingType, userID, resultIfNoData);
		Assert(result != null && result >= 0 && result <= 100, `Fill-percent (${result}) not in range.`);
		return result;
	}

	const {argTruthScoreComposite, argWeightMultiplier, claimTruthScore} = RS_GetAllValues(node.id, path);

	// if (State(a=>a.main.weighting) == WeightingType.ReasonScore) {
	let result: number|n;
	if (node.type == MapNodeType.claim) {
		result = claimTruthScore * 100;
	} else if (node.type == MapNodeType.argument) {
		if (boxType == HolderType.relevance) {
			// return Lerp(0, 100, GetPercentFromXToY(0, 2, argWeightMultiplier));
			result = Lerp(0, 100, argWeightMultiplier);
		} else {
			result = argTruthScoreComposite * 100;
		}
	}

	Assert(result != null && result >= 0 && result <= 100, `Fill-percent (${result}) not in range.`);
	return result;
});

export const GetMarkerPercent_AtPath = CreateAccessor(c=>(node: MapNodeL3, path: string, boxType?: HolderType, ratingType?: NodeRatingType, weighting = WeightingType.votes)=>{
	ratingType = ratingType ?? HolderTypeToRatingType(boxType) ?? GetMainRatingType(node);
	if (ratingType == null) return null;
	if (!node.policy.permissions_base.vote) return null;
	if (weighting == WeightingType.votes || !rsCompatibleNodeTypes.includes(node.type)) {
		return GetRatingAverage_AtPath(node, ratingType, MeID());
	}
});

/* export function GetPaths_MainRatingSet(node: MapNode) {
	let mainRatingType = MapNode.GetMainRatingTypes(node)[0];
	return [`nodeRatings/${node._id}/${mainRatingType}`];
}
export function GetPaths_MainRatingAverage(node: MapNode) {
	let result = GetPaths_MainRatingSet(node);
	if (node.type == MapNodeType.Argument || node.type == MapNodeType.Argument)
		result.AddRange(GetPaths_CalculateArgumentStrength(node, GetNodeChildren(node)));
	return result;
} */

/** Returns an int from 0 to 100. */
/* export function GetMainRatingAverage(node: MapNode, resultIfNoData = null): number {
	// if static category, always show full bar
	if (node._id < 100)
		return 100;
	return GetRatingAverage(node._id, MapNode.GetMainRatingTypes(node)[0], resultIfNoData);
} */

/** Returns an int from 0 to 100. */
/* export function GetMainRatingFillPercent(node: MapNode) {
	let mainRatingAverage = GetMainRatingAverage(node);
	if (node.current.impactPremise && (node.current.impactPremise.thenType == ImpactPremise_ThenType.StrengthenParent || node.current.impactPremise.thenType == ImpactPremise_ThenType.WeakenParent))
		return mainRatingAverage != null ? mainRatingAverage.Distance(50) * 2 : 0;
	return mainRatingAverage || 0;
} */

/* export function GetFillPercentForRatingAverage(node: MapNode, ratingAverage: number, reverseRating?: boolean) {
	ratingAverage = TransformRatingForContext(ratingAverage, reverseRating);
	/*if (node.current.impactPremise && (node.current.impactPremise.thenType == ImpactPremise_ThenType.StrengthenParent || node.current.impactPremise.thenType == ImpactPremise_ThenType.WeakenParent))
		return ratingAverage != null ? ratingAverage.Distance(50) * 2 : 0;*#/
	return ratingAverage || 0;
}
export function TransformRatingForContext(ratingValue: number, reverseRating: boolean) {
	if (ratingValue == null) return null;
	if (reverseRating) return 100 - ratingValue;
	return ratingValue;
} */

/*export class RatingFilter {
	constructor(initialData: Partial<RatingFilter>) {
		CE(this).VSet(initialData);
	}

	includeUser = null as string;
}
export function FilterRatings(ratings: Rating[], filter: RatingFilter) {
	return ratings.filter(a=>filter == null || filter.includeUser == a.id);
}*/

export function TransformRatingForContext(ratingValue: number, reverseRating: boolean) {
	if (ratingValue == null) return null;
	if (reverseRating) return 100 - ratingValue;
	return ratingValue;
}
/* export function GetFillPercentForRatingType(node: MapNodeL3, path: string, ratingType: RatingType, filter?: RatingFilter) {
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
} */

/* export function ShouldRatingTypeBeReversed(ratingType: RatingType, nodeReversed: boolean, contextReversed: boolean) {
	//return nodeReversed || (contextReversed && ratingType == "adjustment");
	return nodeReversed;
} */
export function ShouldRatingTypeBeReversed(node: MapNodeL3, ratingType: NodeRatingType) {
	// return node.type == MapNodeType.Argument && node.finalPolarity != node.link.polarity;
	// if (["impact", "relevance"].Contains(ratingType)) return false;
	return node.link.form == ClaimForm.negation;
}