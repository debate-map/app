import {MapNodeType} from "../MapNodeType";
import {MapNode, MetaThesis_ThenType, MetaThesis_IfType} from "../MapNode";
import {GetRatings, GetRatingAverage} from "../../../../store/Root/Firebase";

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