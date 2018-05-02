import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {MapNode, ClaimForm, MapNodeL2} from "../../Store/firebase/nodes/@MapNode";
import {GetRating, GetRatings, GetRatingValue, GetRatingSet, GetRatingAverage} from "../../Store/firebase/nodeRatings";
import {Rating, RatingsSet} from "../../Store/firebase/nodeRatings/@RatingsRoot";
import {GetRatingTypesForNode, GetNodeForm, GetMainRatingType} from "../../Store/firebase/nodes/$node";
import {CachedTransform} from "js-vextensions";
import {emptyObj} from "./ReducerUtils";
import { ArgumentType } from "Store/firebase/nodes/@MapNodeRevision";
import { CachedTransform_WithStore } from "Frame/Database/DatabaseHelpers";

export function GetArgumentImpactPseudoRating(argument: MapNodeL2, premises: MapNodeL2[], userID: string): Rating {
	if (premises.Any(a=>a == null)) return null; // must still be loading
	if (premises.length == 0) return null;

	let premiseProbabilities = premises.map(premise=> {
		let ratingType = GetRatingTypesForNode(premise)[0].type;
		let ratingValue = GetRatingValue(premise._id, ratingType, userID, null);
		// if user didn't rate this premise, just use the average rating
		if (ratingValue == null) {
			ratingValue = GetRatingAverage(premise._id, ratingType, null, 0);
		}
		
		let form = GetNodeForm(premise, argument);
		let probability = form == ClaimForm.Negation ? 1 - (ratingValue / 100) : (ratingValue / 100);
		return probability;
	});
	let combinedTruthOfPremises;
	if (argument.current.argumentType == ArgumentType.All) {
		combinedTruthOfPremises = premiseProbabilities.reduce((total, current)=>total * current, 1);
	} else if (argument.current.argumentType == ArgumentType.AnyTwo) {
		let strongest = premiseProbabilities.Max(null, true);
		let secondStrongest = premiseProbabilities.length > 1 ? premiseProbabilities.Except(strongest).Max(null, true) : 0;
		combinedTruthOfPremises = strongest * secondStrongest;
	} else {
		combinedTruthOfPremises = premiseProbabilities.Max(null, true);
	}
	
	let relevance = GetRatingValue(argument._id, "relevance", userID, null);
	// if user didn't rate the relevance, just use the average rating
	if (relevance == null) {
		relevance = GetRatingAverage(argument._id, "relevance", null, 0);
	}
	//let strengthForType = adjustment.Distance(50) / 50;
	var result = combinedTruthOfPremises * (relevance / 100);

	return {
		_key: userID,
		updated: null,
		value: (result * 100).RoundTo(1),
	};
}
//export function GetArgumentStrengthEntries(nodeChildren: MapNode[], users: string[]) {
/*export function GetArgumentStrengthPseudoRatings(nodeChildren: MapNode[]): Rating[] {
	if (nodeChildren.Any(a=>a == null)) return []; // must still be loading
	let impactPremise = nodeChildren.First(a=>a.impactPremise != null);
	let premises = nodeChildren.Except(impactPremise);
	if (premises.length == 0) return [];

	let usersWhoRated = nodeChildren.SelectMany(child=>GetRatings(child._id, MapNode.GetMainRatingTypes(child)[0]).map(a=>a._key)).Distinct();
	let result = usersWhoRated.map(userID=>GetArgumentStrengthPseudoRating(nodeChildren, userID));
	return result;
}*/

//export function GetArgumentImpactPseudoRatingSet(argument: MapNodeL2, premises: MapNodeL2[]): {[key: string]: Rating} {
export function GetArgumentImpactPseudoRatingSet(argument: MapNodeL2, premises: MapNodeL2[]): RatingsSet {
	if (premises.Any(a=>a == null)) return emptyObj; // must still be loading
	if (premises.length == 0) return emptyObj;

	let childForms_map = premises.ToMap((child, index)=>`childForm_${index}`, child=> {
		return GetNodeForm(child, argument);
	});
	//let dataUsedInCalculation = {...childRatingSets, ...childForms_map};
	let dataUsedInCalculation = {...childForms_map};
	dataUsedInCalculation.argumentType = argument.current.argumentType;

	//let result = CachedTransform("GetArgumentImpactPseudoRatingSet", [argument._id], dataUsedInCalculation, ()=> {
	let result = CachedTransform_WithStore("GetArgumentImpactPseudoRatingSet", [argument._id], dataUsedInCalculation, ()=> {
		let argRatingSet = GetRatingSet(argument._id, GetMainRatingType(argument)) || emptyObj;
		let premiseRatingSets = premises.map(child=> {
			return GetRatingSet(child._id, GetMainRatingType(child)) || emptyObj;
		});

		let usersWhoRatedArgOrPremise = {};
		for (let userID of argRatingSet.VKeys(true)) {
			usersWhoRatedArgOrPremise[userID] = true;
		}
		for (let [index, child] of premises.entries()) {
			let childRatingSet = premiseRatingSets[index];
			for (let userID of childRatingSet.VKeys(true)) {
				usersWhoRatedArgOrPremise[userID] = true;
			}
		}

		let result = {} as RatingsSet;
		for (let userID in usersWhoRatedArgOrPremise) {
			result[userID] = GetArgumentImpactPseudoRating(argument, premises, userID);
		}
		return result;
	});
	return result;
}

/*export function CalculateArgumentStrength(nodeChildren: MapNode[]) {
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
}*/