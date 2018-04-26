import { MapNodeL3 } from "Store/firebase/nodes/@MapNode";
import { GetNodeChildrenL2, GetNodeChildrenL3 } from "Store/firebase/nodes";
import {MapNodeL2, Polarity, LayerPlusAnchorParentSet} from "../nodes/@MapNode";
import {IsSpecialEmptyArray, emptyArray_forLoading} from "../../../Frame/Store/ReducerUtils";
import {GetFinalPolarity} from "../nodes/$node";
import {MapNodeType} from "../nodes/@MapNodeType";
import { Lerp } from "js-vextensions";
import { ArgumentType } from "Store/firebase/nodes/@MapNodeRevision";
import {GetParentNodeL3} from "../nodes";

export function RS_CalculateTruthScore(claim: MapNodeL3) {
	Assert(claim && claim.type == MapNodeType.Claim, "RS truth-score can only be calculated for a claim.");

	let childArguments = GetChildArguments(claim);
	if (childArguments == null || childArguments.length == 0) return 1;

	let runningAverage;
	let weightTotalSoFar = 0;
	for (let argument of childArguments) {
		let premises = GetNodeChildrenL3(argument).filter(a=>a && a.type == MapNodeType.Claim);
		if (premises.length == 0) continue;

		let truthScoreComposite = RS_CalculateTruthScoreComposite(argument);
		let weight = RS_CalculateWeight(argument, premises);

		if (argument.finalPolarity == Polarity.Opposing) {
			truthScoreComposite = 1 - truthScoreComposite;
		}

		if (runningAverage == null) {
			weightTotalSoFar = weight;
			runningAverage = truthScoreComposite;
		} else {
			weightTotalSoFar += weight; // increase weight first
			let deviationFromAverage = truthScoreComposite - runningAverage;
			let weightRelativeToTotal = weight / weightTotalSoFar;
			runningAverage += deviationFromAverage * weightRelativeToTotal;
		}
	}
	return runningAverage;
}
export function RS_CalculateTruthScoreComposite(argument: MapNodeL3) {
	Assert(argument && argument.type == MapNodeType.Argument, "RS truth-score-composite can only be calculated for an argument.");

	let premises = GetNodeChildrenL3(argument).filter(a=>a && a.type == MapNodeType.Claim);
	if (premises.length == 0) return 0;

	let truthScores = premises.map(premise=>RS_CalculateTruthScore(premise));
	let truthScoreComposite = CombinePremiseTruthScores(truthScores, argument.current.argumentType);
	return truthScoreComposite;
}

export function RS_CalculateBaseWeight(claim: MapNodeL3) {
	let truthScore = RS_CalculateTruthScore(claim);
	// if truth-score drops below 50, it has 0 weight
	if (truthScore <= .5) return 0;

	let weight = (truthScore - .5) / .5;
	return weight;
}
export function RS_CalculateWeightMultiplier(node: MapNodeL3) {
	Assert(node && node.type == MapNodeType.Argument, "RS weight-multiplier can only be calculated for an argument<>claim combo -- which is specified by providing its argument node.");

	let childArguments = GetChildArguments(node);
	if (childArguments == null || childArguments.length == 0) return 1;

	let runningMultiplier = 1;
	let runningDivisor = 1;
	for (let argument of childArguments) {
		let premises = GetNodeChildrenL3(argument).filter(a=>a && a.type == MapNodeType.Claim);
		if (premises.length == 0) continue;

		let truthScores = premises.map(premise=>RS_CalculateTruthScore(premise));
		let truthScoresCombined = CombinePremiseTruthScores(truthScores, argument.current.argumentType);
		let weight = RS_CalculateWeight(argument, premises);

		if (argument.finalPolarity == Polarity.Supporting) {
			runningMultiplier += truthScoresCombined * weight;
		} else {
			runningDivisor += truthScoresCombined * weight;
		}
	}
	return runningMultiplier / runningDivisor;
}
export function RS_CalculateWeight(argument: MapNodeL3, premises: MapNodeL3[]) {
	if (premises.length == 0) return 0;
	let baseWeightsProduct = premises.map(premise=>RS_CalculateBaseWeight(premise)).reduce((prev, cur)=>prev * cur);
	let weightMultiplier = RS_CalculateWeightMultiplier(argument);
	return baseWeightsProduct * weightMultiplier;
}

export type ReasonScoreValues = {argument, premises, argTruthScoreComposite, argWeightMultiplier, argWeight, claimTruthScore, claimBaseWeight};
export type ReasonScoreValues_RSPrefix = {argument, premises, rs_argTruthScoreComposite, rs_argWeightMultiplier, rs_argWeight, rs_claimTruthScore, rs_claimBaseWeight};
export function RS_GetAllValues(node: MapNodeL3, path: string, useRSPrefix = false): ReasonScoreValues & ReasonScoreValues_RSPrefix {
	let parent = GetParentNodeL3(path);
	let argument = node.type == MapNodeType.Argument ? node : parent && parent.type == MapNodeType.Argument ? parent : null;
	let premises = node.type == MapNodeType.Argument ? GetNodeChildrenL3(argument, path).filter(a=>a && a.type == MapNodeType.Claim) : [node];

	if (node.type == MapNodeType.Claim) {
		var claimTruthScore = RS_CalculateTruthScore(node);
		var claimBaseWeight = RS_CalculateBaseWeight(node);
	}
	if (argument) { // (node could instead be a claim under category)
		var argTruthScoreComposite = RS_CalculateTruthScoreComposite(argument);
		var argWeightMultiplier = RS_CalculateWeightMultiplier(argument);
		var argWeight = RS_CalculateWeight(argument, premises);
	}

	if (useRSPrefix) {
		return {
			argument, premises,
			rs_argTruthScoreComposite: argTruthScoreComposite, rs_argWeightMultiplier: argWeightMultiplier, rs_argWeight: argWeight,
			rs_claimTruthScore: claimTruthScore, rs_claimBaseWeight: claimBaseWeight,
		} as any;
	}
	return {argument, premises, argTruthScoreComposite, argWeightMultiplier, argWeight, claimTruthScore, claimBaseWeight} as any;
}

function CombinePremiseTruthScores(truthScores: number[], argumentType: ArgumentType) {
	if (argumentType == ArgumentType.All) {
		return truthScores.reduce((prev, cur)=>prev * cur);
	}
	if (argumentType == ArgumentType.AnyTwo) {
		if (truthScores.length < 2) return 0; 
		return truthScores.Max() * truthScores.Except(truthScores.Max()).Max();
	}
	return truthScores.Max(); // ArgumentType.Any
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