import {ArgumentType} from "Store/firebase/nodes/@MapNodeRevision";
import {emptyObj} from "js-vextensions";
import {StoreAccessor} from "mobx-firelink";
import {GetRatingAverage, GetRatingSet, GetRatingValue} from "../../Store/firebase/nodeRatings";
import {Rating, RatingsSet} from "../../Store/firebase/nodeRatings/@RatingsRoot";
import {GetMainRatingType, GetNodeForm, GetRatingTypesForNode} from "../../Store/firebase/nodes/$node";
import {ClaimForm, MapNodeL2} from "../../Store/firebase/nodes/@MapNode";

export const GetArgumentImpactPseudoRating = StoreAccessor(s=>(argument: MapNodeL2, premises: MapNodeL2[], userID: string): Rating=>{
	if (premises.Any(a=>a == null)) return null; // must still be loading
	if (premises.length == 0) return null;

	const premiseProbabilities = premises.map(premise=>{
		const ratingType = GetRatingTypesForNode(premise)[0].type;
		let ratingValue = GetRatingValue(premise._key, ratingType, userID, null);
		// if user didn't rate this premise, just use the average rating
		if (ratingValue == null) {
			ratingValue = GetRatingAverage(premise._key, ratingType, null) || 0;
		}

		const form = GetNodeForm(premise, argument);
		const probability = form == ClaimForm.Negation ? 1 - (ratingValue / 100) : (ratingValue / 100);
		return probability;
	});
	let combinedTruthOfPremises;
	if (argument.current.argumentType == ArgumentType.All) {
		combinedTruthOfPremises = premiseProbabilities.reduce((total, current)=>total * current, 1);
	} else if (argument.current.argumentType == ArgumentType.AnyTwo) {
		const strongest = premiseProbabilities.Max(null, true);
		const secondStrongest = premiseProbabilities.length > 1 ? premiseProbabilities.Except(strongest).Max(null, true) : 0;
		combinedTruthOfPremises = strongest * secondStrongest;
	} else {
		combinedTruthOfPremises = premiseProbabilities.Max(null, true);
	}

	let relevance = GetRatingValue(argument._key, "relevance", userID, null);
	// if user didn't rate the relevance, just use the average rating
	if (relevance == null) {
		relevance = GetRatingAverage(argument._key, "relevance", null) || 0;
	}
	// let strengthForType = adjustment.Distance(50) / 50;
	const result = combinedTruthOfPremises * (relevance / 100);

	return {
		_key: userID,
		updated: null,
		value: (result * 100).RoundTo(1),
	};
});
// export function GetArgumentStrengthEntries(nodeChildren: MapNode[], users: string[]) {
/* export function GetArgumentStrengthPseudoRatings(nodeChildren: MapNode[]): Rating[] {
	if (nodeChildren.Any(a=>a == null)) return []; // must still be loading
	let impactPremise = nodeChildren.First(a=>a.impactPremise != null);
	let premises = nodeChildren.Except(impactPremise);
	if (premises.length == 0) return [];

	let usersWhoRated = nodeChildren.SelectMany(child=>GetRatings(child._id, MapNode.GetMainRatingTypes(child)[0]).map(a=>a._key)).Distinct();
	let result = usersWhoRated.map(userID=>GetArgumentStrengthPseudoRating(nodeChildren, userID));
	return result;
} */

// export function GetArgumentImpactPseudoRatingSet(argument: MapNodeL2, premises: MapNodeL2[]): {[key: string]: Rating} {
export const GetArgumentImpactPseudoRatingSet = StoreAccessor(s=>(argument: MapNodeL2, premises: MapNodeL2[]): RatingsSet=>{
	if (premises.Any(a=>a == null)) return emptyObj as any; // must still be loading
	if (premises.length == 0) return emptyObj as any;

	const childForms_map = premises.ToMap((child, index)=>`childForm_${index}`, child=>{
		return GetNodeForm(child, argument);
	});
	// let dataUsedInCalculation = {...childRatingSets, ...childForms_map};
	const dataUsedInCalculation = {...childForms_map} as any;
	dataUsedInCalculation.argumentType = argument.current.argumentType;

	// let result = CachedTransform("GetArgumentImpactPseudoRatingSet", [argument._id], dataUsedInCalculation, ()=> {
	// const result = CachedTransform_WithStore('GetArgumentImpactPseudoRatingSet', [argument._key], dataUsedInCalculation, () => {
	const premiseRatingSets = premises.map(child=>{
		return GetRatingSet(child._key, GetMainRatingType(child)) || emptyObj;
	});

	const usersWhoRatedArgOrPremise = {};
	/* const argRatingSet = GetRatingSet(argument._key, GetMainRatingType(argument)) || emptyObj;
	for (const userID of argRatingSet.VKeys()) {
		usersWhoRatedArgOrPremise[userID] = true;
	} */
	for (const userID of (GetRatingSet(argument._key, "relevance") || emptyObj).VKeys()) {
		usersWhoRatedArgOrPremise[userID] = true;
	}
	for (const premise of premises) {
		for (const userID of (GetRatingSet(premise._key, "truth") || emptyObj).VKeys()) {
			usersWhoRatedArgOrPremise[userID] = true;
		}
	}

	for (const [index, child] of premises.entries()) {
		const childRatingSet = premiseRatingSets[index];
		for (const userID of childRatingSet.VKeys()) {
			usersWhoRatedArgOrPremise[userID] = true;
		}
	}

	const result = {} as RatingsSet;
	for (const userID of usersWhoRatedArgOrPremise.VKeys()) {
		result[userID] = GetArgumentImpactPseudoRating(argument, premises, userID);
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