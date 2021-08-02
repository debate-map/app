import {emptyObj, IsNumber, Assert, CE, emptyArray_forLoading, emptyArray} from "web-vcore/nm/js-vextensions.js";
import {CreateAccessor, NoID, PartialBy} from "web-vcore/nm/mobx-graphlink.js";
import {GetRatingAverage, GetRatingValue, GetRatings} from "../../DB/nodeRatings.js";
import {NodeRating, NodeRating_MaybePseudo} from "../../DB/nodeRatings/@NodeRating.js";
import {NodeRatingType} from "../../DB/nodeRatings/@NodeRatingType.js";
import {GetMainRatingType, GetNodeForm, GetRatingTypesForNode} from "../../DB/nodes/$node.js";
import {ClaimForm, MapNodeL2} from "../../DB/nodes/@MapNode.js";
import {ArgumentType} from "../../DB/nodes/@MapNodeRevision.js";

export const GetArgumentImpactPseudoRating = CreateAccessor((argument: MapNodeL2, premises: MapNodeL2[], userID: string): PartialBy<NodeRating, "id" | "accessPolicy">|n=>{
	if (CE(premises).Any(a=>a == null)) return null; // must still be loading
	if (premises.length == 0) return null;

	const premiseProbabilities = premises.map(premise=>{
		const ratingType = GetRatingTypesForNode(premise)[0].type;
		let ratingValue = GetRatingValue(premise.id, ratingType, userID, null);
		// if user didn't rate this premise, just use the average rating
		if (ratingValue == null) {
			ratingValue = GetRatingAverage(premise.id, ratingType, undefined) || 0;
		}

		const form = GetNodeForm(premise, argument);
		const probability = form == ClaimForm.negation ? 1 - (ratingValue / 100) : (ratingValue / 100);
		return probability;
	});
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

	let relevance = GetRatingValue(argument.id, NodeRatingType.relevance, userID, null);
	// if user didn't rate the relevance, just use the average rating
	if (relevance == null) {
		relevance = GetRatingAverage(argument.id, NodeRatingType.relevance) || 0;
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

// export function GetArgumentImpactPseudoRatingSet(argument: MapNodeL2, premises: MapNodeL2[]): {[key: string]: Rating} {
export const GetArgumentImpactPseudoRatings = CreateAccessor((argument: MapNodeL2, premises: MapNodeL2[]): NodeRating_MaybePseudo[]=>{
	if (CE(premises).Any(a=>a == null)) return emptyArray_forLoading as any; // must still be loading
	if (premises.length == 0) return emptyArray as any;

	const childForms_map = CE(premises).ToMapObj((child, index)=>`childForm_${index}`, child=>{
		return GetNodeForm(child, argument);
	});
	// let dataUsedInCalculation = {...childRatingSets, ...childForms_map};
	const dataUsedInCalculation = {...childForms_map} as any;
	dataUsedInCalculation.argumentType = argument.argumentType;

	const usersWhoRatedArgOrPremise = {};
	/* const argRatingSet = GetRatingSet(argument.id, GetMainRatingType(argument)) || emptyObj;
	for (const userID of argRatingSet.VKeys()) {
		usersWhoRatedArgOrPremise[userID] = true;
	} */
	for (const userID of GetRatings(argument.id, NodeRatingType.relevance).map(a=>a.creator)) {
		usersWhoRatedArgOrPremise[userID] = true;
	}
	for (const premise of premises) {
		for (const userID of GetRatings(premise.id, NodeRatingType.truth).map(a=>a.creator)) {
			usersWhoRatedArgOrPremise[userID] = true;
		}
	}

	for (const child of premises) {
		const childRatings = GetRatings(child.id, GetMainRatingType(child));
		//for (const userID of childRatingSet.VKeys()) {
		for (const userID of childRatings.map(a=>a.creator)) {
			usersWhoRatedArgOrPremise[userID] = true;
		}
	}

	const result = [] as NodeRating_MaybePseudo[];
	for (const userID of CE(usersWhoRatedArgOrPremise).VKeys()) {
		result.push(GetArgumentImpactPseudoRating(argument, premises, userID)!);
	}
	return result;
	/* });
	return result; */
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