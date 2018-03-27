import { MapNodeL3 } from "Store/firebase/nodes/@MapNode";
import { GetNodeChildrenL2, GetNodeChildrenL3 } from "Store/firebase/nodes";
import {MapNodeL2, Polarity, LayerPlusAnchorParentSet} from "../nodes/@MapNode";
import {IsSpecialEmptyArray, emptyArray_forLoading} from "../../../Frame/Store/ReducerUtils";
import {GetFinalPolarity} from "../nodes/$node";
import {MapNodeType} from "../nodes/@MapNodeType";
import { Lerp } from "js-vextensions";

export function RS_CalculateTruthScore(node: MapNodeL3) {
	Assert(node.type == MapNodeType.Claim, "RS truth-score can only be calculated for a claim.");

	let childArguments = GetChildArguments(node);
	if (childArguments == null || childArguments.length == 0) return 1;

	let runningAverage;
	let weightTotalSoFar = 0;
	for (let childArgument of childArguments) {
		let childClaim = GetNodeChildrenL3(childArgument).filter(a=>a.type == MapNodeType.Claim)[0];
		if (childClaim == null) continue;

		let childTruthScore = RS_CalculateTruthScore(childClaim);
		let childWeight = RS_CalculateWeight(childClaim, childArgument);

		if (childArgument.finalPolarity == Polarity.Opposing) {
			childTruthScore = 1 - childTruthScore;
		}

		if (runningAverage == null) {
			weightTotalSoFar = childWeight;
			runningAverage = childTruthScore;
		} else {
			weightTotalSoFar += childWeight; // increase weight first
			let deviationFromAverage = childTruthScore - runningAverage;
			let weightRelativeToTotal = childWeight / weightTotalSoFar;
			runningAverage += deviationFromAverage * weightRelativeToTotal;
		}
	}
	return runningAverage;
}

export function RS_CalculateBaseWeight(claim: MapNodeL3) {
	let truthScore = RS_CalculateTruthScore(claim);
	// if truth-score drops below 50, it has 0 weight
	if (truthScore <= .5) return 0;

	let weight = (truthScore - .5) / .5;
	return weight;
}
export function RS_CalculateWeightMultiplier(node: MapNodeL3) {
	Assert(node.type == MapNodeType.Argument, "RS weight-multiplier can only be calculated for an argument<>claim combo -- which is specified by providing its argument node.");

	let childArguments = GetChildArguments(node);
	if (childArguments == null || childArguments.length == 0) return 1;

	let runningMultiplier = 1;
	let runningDivisor = 1;
	for (let childArgument of childArguments) {
		let childClaim = GetNodeChildrenL3(childArgument).filter(a=>a.type == MapNodeType.Claim)[0];
		if (childClaim == null) continue;

		let childTruthScore = RS_CalculateTruthScore(childClaim);
		let childWeight = RS_CalculateWeight(childClaim, childArgument);

		if (childArgument.finalPolarity == Polarity.Supporting) {
			runningMultiplier += childTruthScore * childWeight;
		} else {
			runningDivisor += childTruthScore * childWeight;
		}
	}
	return runningMultiplier / runningDivisor;
}
export function RS_CalculateWeight(claim: MapNodeL3, argument: MapNodeL3) {
	let weight = RS_CalculateBaseWeight(claim);
	let weightMultiplier = RS_CalculateWeightMultiplier(argument);
	weight *= weightMultiplier;
	return weight;
}

function GetChildArguments(node: MapNodeL3): MapNodeL3[] {
	let children = GetNodeChildrenL3(node);
	if (children == emptyArray_forLoading || children.Any(a=>a == null)) return null; // null means still loading
	let childArguments = children.filter(a=>a.type == MapNodeType.Argument);
	for (let child of childArguments) {
		let childChildren = GetNodeChildrenL3(child);
		if (childChildren == emptyArray_forLoading || childChildren.Any(a=>a == null)) return null; // null means still loading
	}

	return childArguments;
}