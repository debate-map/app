import {emptyObj, IsNumber, Assert, CE, emptyArray_forLoading, emptyArray} from "web-vcore/nm/js-vextensions.js";
import {CreateAccessor, NoID, PartialBy} from "web-vcore/nm/mobx-graphlink.js";
import {GetRating, GetRatingAverage, GetRatings} from "../../DB/nodeRatings.js";
import {NodeRating, NodeRating_MaybePseudo} from "../../DB/nodeRatings/@NodeRating.js";
import {NodeRatingType} from "../../DB/nodeRatings/@NodeRatingType.js";
import {GetMainRatingType, GetNodeForm, GetRatingTypesForNode} from "../../DB/nodes/$node.js";
import {ClaimForm, MapNode, NodeL2} from "../../DB/nodes/@MapNode.js";
import {ArgumentType} from "../../DB/nodes/@NodeRevision.js";

export const GetArgumentImpactPseudoRating = CreateAccessor((argument: MapNode, premises: MapNode[], userID: string, useAverageForMissing = false): PartialBy<NodeRating, "id" | "accessPolicy">|n=>{
	if (CE(premises).Any(a=>a == null)) return null; // must still be loading
	if (premises.length == 0) return null;

	const premiseProbabilities = [] as number[];
	for (const premise of premises) {
		//const ratingType = GetRatingTypesForNode(premise)[0].type;
		const ratingType = NodeRatingType.truth;
		let ratingValue = GetRating(premise.id, ratingType, userID)?.value ?? null;
		// if user didn't rate this premise, just use the average rating
		if (ratingValue == null) {
			if (useAverageForMissing) {
				ratingValue = GetRatingAverage(premise.id, ratingType, undefined) || 0;
			} else {
				return null;
			}
		}

		const form = GetNodeForm(premise, argument);
		const probability = form == ClaimForm.negation ? 1 - (ratingValue / 100) : (ratingValue / 100);
		premiseProbabilities.push(probability);
	}

	let combinedTruthOfPremises;
	if (argument.argumentType == ArgumentType.all) {
		combinedTruthOfPremises = premiseProbabilities.reduce((total, current)=>total * current, 1);
	} else if (argument.argumentType == ArgumentType.anyTwo) {
		const strongest = CE(premiseProbabilities).Max(undefined, true);
		const secondStrongest = premiseProbabilities.length > 1 ? CE(CE(premiseProbabilities).Exclude({excludeEachOnlyOnce: true}, strongest)).Max(undefined, true) : 0;
		combinedTruthOfPremises = strongest * secondStrongest;
	} else {
		combinedTruthOfPremises = CE(premiseProbabilities).Max(undefined, true);
	}

	let relevance = GetRating(argument.id, NodeRatingType.relevance, userID)?.value ?? null;
	// if user didn't rate the relevance, just use the average rating
	if (relevance == null) {
		if (useAverageForMissing) {
			relevance = GetRatingAverage(argument.id, NodeRatingType.relevance) || 0;
		} else {
			return null;
		}
	}
	
	// let strengthForType = adjustment.Distance(50) / 50;
	const result = combinedTruthOfPremises * (relevance / 100);
	Assert(IsNumber(result), `Impact pseudo-rating is null. @combinedTruthOfPremises:${combinedTruthOfPremises} @relevance:${relevance}`);

	return {
		//_key: userID,
		//accessPolicy: null,
		node: argument.id,
		type: NodeRatingType.impact,
		creator: userID,
		createdAt: Date.now(),
		value: CE(result * 100).RoundTo(1),
	};
});
// export function GetArgumentStrengthEntries(nodeChildren: MapNode[], users: string[]) {
/* export function GetArgumentStrengthPseudoRatings(nodeChildren: MapNode[]): Rating[] {
	if (nodeChildren.Any(a=>a == null)) return []; // must still be loading
	let impactPremise = nodeChildren.First(a=>a.impactPremise != null);
	let premises = nodeChildren.Except(impactPremise);
	if (premises.length == 0) return [];

	let usersWhoRated = nodeChildren.SelectMany(child=>GetRatings(child._id, MapNode.GetMainRatingTypes(child)[0]).map(a=>a.id)).Distinct();
	let result = usersWhoRated.map(userID=>GetArgumentStrengthPseudoRating(nodeChildren, userID));
	return result;
} */

export function RatingListAfterRemovesAndAdds(baseList: NodeRating[], ratingsToRemove?: string[], ratingsToAdd?: NodeRating[], ratingsToAdd_filter?: {nodeID: string, ratingType: NodeRatingType, userIDs?: string[]|n}) {
	let result = baseList.slice();
	if (ratingsToRemove) result = result.filter(a=>!ratingsToRemove.includes(a.id));
	if (ratingsToAdd) {
		const filter = ratingsToAdd_filter;
		Assert(filter != null, "If supplying ratingsToAdd, must also supply ratingsToAdd_filter.");
		result.push(...ratingsToAdd.filter(a=>a.node == filter.nodeID && a.type == filter.ratingType && (filter.userIDs == null || filter.userIDs.includes(a.creator))));
	}
	return result;
}

export const GetArgumentImpactPseudoRatings = CreateAccessor((
	argument: MapNode, premises: MapNode[], userIDs?: string[]|n,
	useAverageForMissing = false, ratingsBeingRemoved?: string[], ratingsBeingAdded?: NodeRating[],
): NodeRating_MaybePseudo[]=>{
	if (CE(premises).Any(a=>a == null)) return emptyArray_forLoading as any; // must still be loading
	if (premises.length == 0) return emptyArray as any;

	let argumentRelevanceRatings = GetRatings(argument.id, NodeRatingType.relevance, userIDs);
	argumentRelevanceRatings = RatingListAfterRemovesAndAdds(argumentRelevanceRatings, ratingsBeingRemoved, ratingsBeingAdded, {nodeID: argument.id, ratingType: NodeRatingType.relevance, userIDs});

	const usersWhoRatedArgAndPremises = new Set(argumentRelevanceRatings.map(a=>a.creator));
	for (const premise of premises) {
		let premiseTruthRatings = GetRatings(premise.id, NodeRatingType.truth, userIDs);
		premiseTruthRatings = RatingListAfterRemovesAndAdds(premiseTruthRatings, ratingsBeingRemoved, ratingsBeingAdded, {nodeID: premise.id, ratingType: NodeRatingType.truth, userIDs});

		const usersWhoRatedPremise = new Set(premiseTruthRatings.map(a=>a.creator));
		for (const userID of usersWhoRatedArgAndPremises) {
			if (!usersWhoRatedPremise.has(userID)) {
				usersWhoRatedArgAndPremises.delete(userID);
			}
		}
	}

	const result = [] as NodeRating_MaybePseudo[];
	for (const userID of usersWhoRatedArgAndPremises) {
		const impactRating = GetArgumentImpactPseudoRating(argument, premises, userID, useAverageForMissing);
		if (impactRating) {
			result.push(impactRating);
		}
	}
	return result;
});

/* export function CalculateArgumentStrength(nodeChildren: MapNode[]) {
	if (nodeChildren.Any(a=>a == null)) return 0; // must still be loading
	let impactPremise = nodeChildren.First(a=>a.impactPremise != null);
	let premises = nodeChildren.Except(impactPremise);
	if (premises.length == 0) return 0;

	let premiseProbabilities = premises.map(child=>GetRatingAverage(child._id, "probability", 0) / 100);
	let all = impactPremise.impactPremise.ifType == ImpactPremise_IfType.All;
	let combinedProbabilityOfPremises = all
		? premiseProbabilities.reduce((total, current)=>total * current, 1)
		: premiseProbabilities.Max(null, true);

	if (impactPremise.impactPremise.thenType == ImpactPremise_ThenType.StrengthenParent || impactPremise.impactPremise.thenType == ImpactPremise_ThenType.WeakenParent) {
		let averageAdjustment = GetRatingAverage(impactPremise._id, "adjustment", 50);
		let strengthForType = averageAdjustment.Distance(50) / 50;
		var result = combinedProbabilityOfPremises * strengthForType;
	} else {
		var result = combinedProbabilityOfPremises * (GetRatingAverage(impactPremise._id, "probability", 0) / 100);
	}
	return (result * 100).RoundTo(1);
} */