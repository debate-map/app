import {MapNodeType} from "../MapNodeType";
import {MapNode, MetaThesis_ThenType, MetaThesis_IfType} from "../MapNode";
import {GetRating, GetRatingValue, Rating} from "../../../../store/Root/Firebase";
import {
    GetMainRatingFillPercent,
    GetPaths_NodeRatingsRoot,
    GetRatingAverage,
    GetRatings
} from "../../../../store/Root/Firebase";

export function CalculateArgumentStrength(nodeChildren: MapNode[]) {
	if (nodeChildren.Any(a=>a == null)) return 0; // must still be loading
	let metaThesis = nodeChildren.First(a=>a.metaThesis);
	let premises = nodeChildren.Except(metaThesis);
	if (premises.length == 0) return 0;

	let premiseProbabilities = premises.map(child=>GetRatingAverage(child._id, "probability", 0) / 100);
	let all = metaThesis.metaThesis_ifType == MetaThesis_IfType.All;
	let combinedProbabilityOfPremises = all
		? premiseProbabilities.reduce((total, current)=>total * current, 1)
		: premiseProbabilities.Max();
	
	if (metaThesis.metaThesis_thenType == MetaThesis_ThenType.StrengthenParent || metaThesis.metaThesis_thenType == MetaThesis_ThenType.WeakenParent) {
		let averageAdjustment = GetRatingAverage(metaThesis._id, "adjustment", 50);
		let strengthForType = averageAdjustment.Distance(50) / 50;
		var result = combinedProbabilityOfPremises * strengthForType;
	} else {
		var result = combinedProbabilityOfPremises * (GetRatingAverage(metaThesis._id, "probability", 0) / 100);
	}
	return (result * 100).RoundTo(1);
}

export function GetArgumentStrengthPseudoRating(nodeChildren: MapNode[], userID: string): Rating {
	if (nodeChildren.Any(a=>a == null)) return null; // must still be loading
	let metaThesis = nodeChildren.First(a=>a.metaThesis);
	let premises = nodeChildren.Except(metaThesis);
	if (premises.length == 0) return null;

	let premiseProbabilities = premises.map(child=>GetRatingValue(child._id, "probability", userID, 0) / 100);
	let all = metaThesis.metaThesis_ifType == MetaThesis_IfType.All;
	let combinedProbabilityOfPremises = all
		? premiseProbabilities.reduce((total, current)=>total * current, 1)
		: premiseProbabilities.Max();
	
	if (metaThesis.metaThesis_thenType == MetaThesis_ThenType.StrengthenParent || metaThesis.metaThesis_thenType == MetaThesis_ThenType.WeakenParent) {
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
export function GetArgumentStrengthPseudoRatings(nodeChildren: MapNode[]): Rating[] {
	if (nodeChildren.Any(a=>a == null)) return []; // must still be loading
	let metaThesis = nodeChildren.First(a=>a.metaThesis);
	let premises = nodeChildren.Except(metaThesis);
	if (premises.length == 0) return [];

	let usersWhoRated = nodeChildren.SelectMany(child=>GetRatings(child._id, MapNode.GetMainRatingTypes(child)[0]).map(a=>a._key)).Distinct();
	let result = usersWhoRated.map(userID=>GetArgumentStrengthPseudoRating(nodeChildren, userID));
	return result;
}