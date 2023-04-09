import {Lerp, emptyObj, ToJSON, Assert, IsNumber, CE, emptyArray_forLoading, CreateStringEnum, emptyArray, GetValues} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, CreateAccessor, GetDocs, NoID, Validate, AddSchema} from "web-vcore/nm/mobx-graphlink.js";
import {observable} from "web-vcore/nm/mobx.js";
import {GetRatingTypeInfo, NodeRatingType, RatingType_Info} from "./nodeRatings/@NodeRatingType.js";
import {NodeRating, NodeRating_MaybePseudo} from "./nodeRatings/@NodeRating.js";
import {RS_GetAllValues} from "./nodeRatings/ReasonScore.js";
import {GetNodeChildrenL2, GetNode} from "./nodes.js";
import {GetMainRatingType, GetNodeL2} from "./nodes/$node.js";
import {ClaimForm, NodeL2, NodeL3, RatingSummary} from "./nodes/@Node.js";
import {ChildGroup, NodeType} from "./nodes/@NodeType.js";
import {MeID} from "./users.js";
import {GetAccessPolicy, PermitCriteriaPermitsNoOne} from "./accessPolicies.js";
import {GetArgumentImpactPseudoRatings} from "../Utils/DB/RatingProcessor.js";
import {Map, NodeRevision} from "../DB.js";

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
		const premises = nodeChildren.filter(a=>a == null || a.type == NodeType.claim);
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
export const GetRatingAverage_AtPath = CreateAccessor(<T = undefined>(node: NodeL3, ratingType: NodeRatingType, userIDs?: string[]|n, resultIfNoData?: T): number|T=>{
	let result = GetRatingAverage(node.id, ratingType, userIDs);
	if (result == null) return resultIfNoData as T;
	if (ShouldRatingTypeBeReversed(node, ratingType)) {
		result = 100 - result;
	}
	return result;
});

export enum ChildOrdering {
	//unchanged = "unchanged",
	manual = "manual",
	date = "date",
	votes = "votes",
	reasonScore = "reasonScore",
}
AddSchema("ChildOrdering", {enum: GetValues(ChildOrdering)});
export const ChildOrdering_infoText = `
The ordering of a node's children can be modified in multiple ways.

The final ordering-type is determined by the first provided value (ie. not set to "Unchanged") in this list:
1) User setting, in the Layout dropdown (at top-right when map is open)
2) Node setting, in node Details->Others panel
3) Map setting, in map's Details dropdown
4) Fallback value based on context ("manual" for an argument's premises, and "votes" for everything else)

Note: If children have identical ordering values (eg. by votes, but neither has votes), then they're sub-sorted by manual-ordering data.
`.AsMultiline(0);
export function GetChildOrdering_Final(parentNode: NodeL2, childGroup: ChildGroup, map?: Map, userOverride?: ChildOrdering) {
	let result = parentNode.type == NodeType.argument && childGroup == ChildGroup.generic ? ChildOrdering.manual : ChildOrdering.votes;
	if (map?.extras.defaultChildOrdering) result = map.extras.defaultChildOrdering;
	if (parentNode.current.displayDetails?.childOrdering) result = parentNode.current.displayDetails.childOrdering;
	if (userOverride) result = userOverride;
	return result;
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

const rsCompatibleNodeTypes = [NodeType.argument, NodeType.claim];
/** Returns a number based on the ordering-type for the given node, which will result in proper ordering when calling `nodes.OrderBy(node=>GetOrderingValue_AtPath(node, ...))`. (this means eg. vote-values are reversed)  */
export const GetOrderingValue_AtPath = CreateAccessor((node: NodeL3, path: string, orderingType: ChildOrdering, boxType?: ChildGroup|n, ratingType?: NodeRatingType): number | string=>{
	if (orderingType == ChildOrdering.manual && node.link) {
		return node.link.orderKey;
	}

	if (orderingType == ChildOrdering.date) {
		return node.createdAt;
	}

	const AsVoteResult = (voteValue: number)=>{
		return -voteValue; // reverse, so that the highest-rated nodes show up first (the NodeChildHolder comp calls the OrderBy() method, which sorts ascendingly)
	};

	const useReasonScoreValues = orderingType == ChildOrdering.reasonScore && rsCompatibleNodeTypes?.includes(node.type);
	if (useReasonScoreValues) {
		const {argTruthScoreComposite, argWeightMultiplier, claimTruthScore} = RS_GetAllValues(node.id, path);

		// if (State(a=>a.main.weighting) == WeightingType.ReasonScore) {
		const ratingScore = (()=>{
			if (node.type == NodeType.claim) {
				return AsVoteResult(claimTruthScore * 100);
			}
			if (node.type == NodeType.argument) {
				if (boxType == ChildGroup.relevance) {
					// return Lerp(0, 100, GetPercentFromXToY(0, 2, argWeightMultiplier));
					return AsVoteResult(Lerp(0, 100, argWeightMultiplier));
				}
				return AsVoteResult(argTruthScoreComposite * 100);
			}
			Assert(false);
		})();
		AssertBetween0And100OrNull(ratingScore);
		return AsVoteResult(ratingScore);
	}

	const ratingType_final = ratingType ?? ChildGroupToRatingType(boxType) ?? GetMainRatingType(node);
	const result = GetRatingAverage_AtPath(node, ratingType_final, null, 0);
	AssertBetween0And100OrNull(result);
	return AsVoteResult(result);
});

export const GetMarkerPercent_AtPath = CreateAccessor((node: NodeL3, path: string, boxType?: ChildGroup|n, ratingType?: NodeRatingType, weighting = ChildOrdering.votes)=>{
	ratingType = ratingType ?? ChildGroupToRatingType(boxType) ?? GetMainRatingType(node);
	if (ratingType == null) return null;
	const meID = MeID();
	if (meID == null) return null;

	if (PermitCriteriaPermitsNoOne(node.policy.permissions.nodes.vote)) return null;
	if (weighting == ChildOrdering.votes || !rsCompatibleNodeTypes.includes(node.type)) {
		return GetRatingAverage_AtPath(node, ratingType, [meID]);
	}
});

/* export function GetPaths_MainRatingSet(node: NodeL1) {
	let mainRatingType = NodeL1.GetMainRatingTypes(node)[0];
	return [`nodeRatings/${node._id}/${mainRatingType}`];
}
export function GetPaths_MainRatingAverage(node: NodeL1) {
	let result = GetPaths_MainRatingSet(node);
	if (node.type == NodeType.Argument || node.type == NodeType.Argument)
		result.AddRange(GetPaths_CalculateArgumentStrength(node, GetNodeChildren(node)));
	return result;
} */

/** Returns an int from 0 to 100. */
/* export function GetMainRatingAverage(node: NodeL1, resultIfNoData = null): number {
	// if static category, always show full bar
	if (node._id < 100)
		return 100;
	return GetRatingAverage(node._id, NodeL1.GetMainRatingTypes(node)[0], resultIfNoData);
} */

/** Returns an int from 0 to 100. */
/* export function GetMainRatingFillPercent(node: NodeL1) {
	let mainRatingAverage = GetMainRatingAverage(node);
	if (node.current.impactPremise && (node.current.impactPremise.thenType == ImpactPremise_ThenType.StrengthenParent || node.current.impactPremise.thenType == ImpactPremise_ThenType.WeakenParent))
		return mainRatingAverage != null ? mainRatingAverage.Distance(50) * 2 : 0;
	return mainRatingAverage || 0;
} */

/* export function GetFillPercentForRatingAverage(node: NodeL1, ratingAverage: number, reverseRating?: boolean) {
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
/* export function GetFillPercentForRatingType(node: NodeL3, path: string, ratingType: RatingType, filter?: RatingFilter) {
	if (ratingType == "impact") {
		let nodeChildren = GetNodeChildrenL3(node, path);
		//let nodeChildren = GetNodeChildrenL2(node).map(child=>AsNodeL3(child, Polarity.Supporting, GetLinkUnderParent(child._id, node)));
		if (nodeChildren.Any(a=>a == null)) return 0;
		let premises = nodeChildren.filter(a=>a.type == NodeType.Claim);
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
export function ShouldRatingTypeBeReversed(node: NodeL3, ratingType: NodeRatingType) {
	// return node.type == NodeType.Argument && node.finalPolarity != node.link.polarity;
	// if (["impact", "relevance"].Contains(ratingType)) return false;
	return node.link?.form == ClaimForm.negation;
}