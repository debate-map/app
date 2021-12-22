import {Lerp, emptyObj, ToJSON, Assert, IsNumber, CE, emptyArray_forLoading, CreateStringEnum, emptyArray} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, CreateAccessor, GetDocs, NoID, Validate} from "web-vcore/nm/mobx-graphlink.js";
import {observable} from "web-vcore/nm/mobx.js";
import {GetRatingTypeInfo, NodeRatingType, RatingType_Info} from "./nodeRatings/@NodeRatingType.js";
import {NodeRating, NodeRating_MaybePseudo} from "./nodeRatings/@NodeRating.js";
import {RS_GetAllValues} from "./nodeRatings/ReasonScore.js";
import {GetNodeChildrenL2, GetNode} from "./nodes.js";
import {GetMainRatingType, GetNodeL2} from "./nodes/$node.js";
import {ClaimForm, MapNodeL3, RatingSummary} from "./nodes/@MapNode.js";
import {ChildGroup, MapNodeType} from "./nodes/@MapNodeType.js";
import {MeID} from "./users.js";
import {GetAccessPolicy, PermitCriteriaPermitsNoOne} from "./accessPolicies.js";
import {GetArgumentImpactPseudoRatings} from "../Utils/DB/RatingProcessor.js";

export const GetRatingSummary = CreateAccessor((nodeID: string, ratingType: NodeRatingType)=>{
	const node = GetNode(nodeID);
	const ratingTypeInfo = GetRatingTypeInfo(ratingType);
	return node?.extras.ratingSummaries?.[ratingType]
		// if rating-summary entry is missing, it must mean no one has rated the node yet, so return a corresponding RatingSummary object
		?? new RatingSummary({
			average: null,
			countsByRange: ratingTypeInfo.valueRanges.map(a=>0),
		});
});

export const GetNodeRating = CreateAccessor((id: string)=>{
	return GetDoc({}, a=>a.nodeRatings.get(id!));
});

export const GetRatings = CreateAccessor(<
	((nodeID: string, ratingType?: Exclude<NodeRatingType, "impact">|n, userIDs?: string[]|n)=>NodeRating[]) & // if rating-type is known to not be "impact", all results will be "true ratings"
	((nodeID: string, ratingType?: NodeRatingType|n, userIDs?: string[]|n)=>NodeRating_MaybePseudo[]) // else, some results may lack the "id" field
>((nodeID: string, ratingType: NodeRatingType|n, userIDs?: string[]|n): NodeRating_MaybePseudo[]=>{
	if (ratingType == "impact") {
		//Assert(userIDs == null, `Cannot currently use a userIDs filter for getting ratings of type "impact". (query-level optimization not yet added for that case)`);
		const node = GetNodeL2(nodeID);
		if (node === null) return emptyArray;
		const nodeChildren = GetNodeChildrenL2(nodeID);
		const premises = nodeChildren.filter(a=>a == null || a.type == MapNodeType.claim);
		return GetArgumentImpactPseudoRatings(node, premises, userIDs);
	}

	/*const ratings = GetRatings(nodeID, ratingType);
	if (ratingSet == null) return [];
	return FilterRatings(CE(ratingSet).VValues(), filter);
	//return FilterRatings(Array.from(ratingSet.values()), filter);*/

	return GetDocs({
		params: {filter: {
			node: {equalTo: nodeID},
			type: ratingType && {equalTo: ratingType},
			//creator: userID && {equalTo: userID},
			creator: userIDs != null && {in: userIDs},
		}},
	}, a=>a.nodeRatings);
}));
export const GetRating = CreateAccessor((nodeID: string, ratingType: NodeRatingType, userID: string|n)=>{
	if (userID == null) return null;
	return GetRatings(nodeID, ratingType, [userID])[0];
});
/*export const GetRatingValue = CreateAccessor(<T>(nodeID: string, ratingType: NodeRatingType, userID: string, resultIfNoData?: T): number|T=>{
	const rating = GetRating(nodeID, ratingType, userID);
	return rating ? rating.value : resultIfNoData as T;
});*/
export const GetRatingAverage = CreateAccessor((nodeID: string, ratingType: NodeRatingType, userIDs?: string[]|n): number|n=>{
	const node = GetNodeL2(nodeID);
	if (node && PermitCriteriaPermitsNoOne(node.policy.permissions.nodes.vote)) return 100;

	// if rating-set restricted to specific users, get the raw rating-set
	if (userIDs) {
		const ratings = GetRatings(nodeID, ratingType, userIDs);
		if (ratings.length == 0) return null;
		const result = CE(CE(ratings.map(a=>a.value)).Average()).RoundTo(1);
		Assert(result >= 0 && result <= 100, `Rating-average (${result}) not in range. Invalid ratings: ${ToJSON(ratings.map(a=>a.value).filter(a=>!IsNumber(a)))}`);
		return result;
	}

	const ratingSummary = GetRatingSummary(nodeID, ratingType);
	return ratingSummary?.average;
});
export const GetRatingAverage_AtPath = CreateAccessor(<T = undefined>(node: MapNodeL3, ratingType: NodeRatingType, userIDs?: string[]|n, resultIfNoData?: T): number|T=>{
	let result = GetRatingAverage(node.id, ratingType, userIDs);
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

function ChildGroupToRatingType(childGroup: ChildGroup|n) {
	return {
		[ChildGroup.truth]: NodeRatingType.truth,
		[ChildGroup.relevance]: NodeRatingType.relevance,
	}[childGroup!] as any;
}

export function AssertBetween0And100OrNull(val: number|n) {
	Assert(val == null || (val >= 0 && val <= 100), `Fill-percent (${val}) not in range, and not null.`);
}

const rsCompatibleNodeTypes = [MapNodeType.argument, MapNodeType.claim];
export const GetOrderingScores_AtPath = CreateAccessor((node: MapNodeL3, path: string, boxType?: ChildGroup|n, ratingType?: NodeRatingType, weighting = WeightingType.votes, resultIfNoData = null)=>{
	ratingType = ratingType ?? ChildGroupToRatingType(boxType) ?? GetMainRatingType(node);
	if (ratingType == null) return resultIfNoData;

	const useReasonScoreValues = weighting == WeightingType.reasonScore && rsCompatibleNodeTypes?.includes(node.type);
	if (useReasonScoreValues) {
		const {argTruthScoreComposite, argWeightMultiplier, claimTruthScore} = RS_GetAllValues(node.id, path);

		// if (State(a=>a.main.weighting) == WeightingType.ReasonScore) {
		let result: number|n;
		if (node.type == MapNodeType.claim) {
			result = claimTruthScore * 100;
		} else if (node.type == MapNodeType.argument) {
			if (boxType == ChildGroup.relevance) {
				// return Lerp(0, 100, GetPercentFromXToY(0, 2, argWeightMultiplier));
				result = Lerp(0, 100, argWeightMultiplier);
			} else {
				result = argTruthScoreComposite * 100;
			}
		}

		AssertBetween0And100OrNull(result);
		return result;
	}

	const result = GetRatingAverage_AtPath(node, ratingType, null, resultIfNoData);
	AssertBetween0And100OrNull(result);
	return result;
});

export const GetMarkerPercent_AtPath = CreateAccessor((node: MapNodeL3, path: string, boxType?: ChildGroup|n, ratingType?: NodeRatingType, weighting = WeightingType.votes)=>{
	ratingType = ratingType ?? ChildGroupToRatingType(boxType) ?? GetMainRatingType(node);
	if (ratingType == null) return null;
	const meID = MeID();
	if (meID == null) return null;

	if (PermitCriteriaPermitsNoOne(node.policy.permissions.nodes.vote)) return null;
	if (weighting == WeightingType.votes || !rsCompatibleNodeTypes.includes(node.type)) {
		return GetRatingAverage_AtPath(node, ratingType, [meID]);
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

export function TransformRatingForContext(ratingValue: number, reverseRating: boolean): number;
export function TransformRatingForContext(ratingValue: number|n, reverseRating: boolean): number|n;
export function TransformRatingForContext(ratingValue: number|n, reverseRating: boolean) {
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
	return node.link?.form == ClaimForm.negation;
}