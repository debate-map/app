import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {MapNode, MetaThesis_ThenType, MetaThesis_IfType, GetMainRatingTypesForNode} from "../../Store/firebase/nodes/@MapNode";
import {GetRating, GetRatingValue, GetRatingSet} from "../../Store/firebase/nodeRatings";
import {GetRatingAverage, GetRatings} from "../../Store/firebase/nodeRatings";
import {Rating} from "../../Store/firebase/nodeRatings/@RatingsRoot";

/*export function CalculateArgumentStrength(nodeChildren: MapNode[]) {
	if (nodeChildren.Any(a=>a == null)) return 0; // must still be loading
	let metaThesis = nodeChildren.First(a=>a.metaThesis != null);
	let premises = nodeChildren.Except(metaThesis);
	if (premises.length == 0) return 0;

	let premiseProbabilities = premises.map(child=>GetRatingAverage(child._id, "probability", 0) / 100);
	let all = metaThesis.metaThesis.ifType == MetaThesis_IfType.All;
	let combinedProbabilityOfPremises = all
		? premiseProbabilities.reduce((total, current)=>total * current, 1)
		: premiseProbabilities.Max();
	
	if (metaThesis.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || metaThesis.metaThesis.thenType == MetaThesis_ThenType.WeakenParent) {
		let averageAdjustment = GetRatingAverage(metaThesis._id, "adjustment", 50);
		let strengthForType = averageAdjustment.Distance(50) / 50;
		var result = combinedProbabilityOfPremises * strengthForType;
	} else {
		var result = combinedProbabilityOfPremises * (GetRatingAverage(metaThesis._id, "probability", 0) / 100);
	}
	return (result * 100).RoundTo(1);
}*/

export function GetArgumentStrengthPseudoRating(nodeChildren: MapNode[], userID: string): Rating {
	if (nodeChildren.Any(a=>a == null)) return null; // must still be loading
	let metaThesis = nodeChildren.First(a=>a.metaThesis != null);
	let premises = nodeChildren.Except(metaThesis);
	if (premises.length == 0) return null;

	let premiseProbabilities = premises.map(child=>GetRatingValue(child._id, "probability", userID, 0) / 100);
	let combinedProbabilityOfPremises;
	if (metaThesis.metaThesis.ifType == MetaThesis_IfType.All)
		combinedProbabilityOfPremises = premiseProbabilities.reduce((total, current)=>total * current, 1);
	else if (metaThesis.metaThesis.ifType == MetaThesis_IfType.AnyTwo) {
		let strongest = premiseProbabilities.Max();
		let secondStrongest = premiseProbabilities.length > 1 ? premiseProbabilities.Except(strongest).Max() : 0;
		combinedProbabilityOfPremises = strongest * secondStrongest;
	} else 
		combinedProbabilityOfPremises = premiseProbabilities.Max();
	
	if (metaThesis.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || metaThesis.metaThesis.thenType == MetaThesis_ThenType.WeakenParent) {
		let adjustment = GetRatingValue(metaThesis._id, "adjustment", userID, 50);
		let strengthForType = adjustment.Distance(50) / 50;
		var result = combinedProbabilityOfPremises * strengthForType;
	} else {
		var result = combinedProbabilityOfPremises * (GetRatingValue(metaThesis._id, "probability", userID, 0) / 100);
	}
	return {
		_key: userID,
		updated: null,
		value: (result * 100).RoundTo(1),
	};
}
//export function GetArgumentStrengthEntries(nodeChildren: MapNode[], users: string[]) {
/*export function GetArgumentStrengthPseudoRatings(nodeChildren: MapNode[]): Rating[] {
	if (nodeChildren.Any(a=>a == null)) return []; // must still be loading
	let metaThesis = nodeChildren.First(a=>a.metaThesis != null);
	let premises = nodeChildren.Except(metaThesis);
	if (premises.length == 0) return [];

	let usersWhoRated = nodeChildren.SelectMany(child=>GetRatings(child._id, MapNode.GetMainRatingTypes(child)[0]).map(a=>a._key)).Distinct();
	let result = usersWhoRated.map(userID=>GetArgumentStrengthPseudoRating(nodeChildren, userID));
	return result;
}*/
export function GetArgumentStrengthPseudoRatingSet(nodeChildren: MapNode[]): {[key: string]: Rating} {
	if (nodeChildren.Any(a=>a == null)) return {}; // must still be loading
	let metaThesis = nodeChildren.FirstOrX(a=>a.metaThesis != null); // meta-thesis might not be loaded yet
	let premises = nodeChildren.Except(metaThesis);
	if (premises.length == 0) return {};

	let usersWhoRatedAllChildren = null;
	for (let child of nodeChildren) {
		let childRatingSet = GetRatingSet(child._id, GetMainRatingTypesForNode(child)[0]) || {};
		if (usersWhoRatedAllChildren == null) {
			usersWhoRatedAllChildren = {};
			for (let userID of childRatingSet.VKeys(true))
				usersWhoRatedAllChildren[userID] = true;
		} else {
			for (let userID in usersWhoRatedAllChildren) {
				if (childRatingSet[userID] == null)
					delete usersWhoRatedAllChildren[userID];
			}
		}
	}

	let result = {};
	for (let userID in usersWhoRatedAllChildren)
		result[userID] = GetArgumentStrengthPseudoRating(nodeChildren, userID);
	return result;
}

/*export function CalculateArgumentStrength(nodeChildren: MapNode[]) {
	if (nodeChildren.Any(a=>a == null)) return 0; // must still be loading
	let metaThesis = nodeChildren.First(a=>a.metaThesis != null);
	let premises = nodeChildren.Except(metaThesis);
	if (premises.length == 0) return 0;

	let premiseProbabilities = premises.map(child=>GetRatingAverage(child._id, "probability", 0) / 100);
	let all = metaThesis.metaThesis.ifType == MetaThesis_IfType.All;
	let combinedProbabilityOfPremises = all
		? premiseProbabilities.reduce((total, current)=>total * current, 1)
		: premiseProbabilities.Max();
	
	if (metaThesis.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || metaThesis.metaThesis.thenType == MetaThesis_ThenType.WeakenParent) {
		let averageAdjustment = GetRatingAverage(metaThesis._id, "adjustment", 50);
		let strengthForType = averageAdjustment.Distance(50) / 50;
		var result = combinedProbabilityOfPremises * strengthForType;
	} else {
		var result = combinedProbabilityOfPremises * (GetRatingAverage(metaThesis._id, "probability", 0) / 100);
	}
	return (result * 100).RoundTo(1);
}*/