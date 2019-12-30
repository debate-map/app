import {GetNodeChildrenL3} from "Store/firebase/nodes";
import {MapNodeL3, MapNodeL2} from "Store/firebase/nodes/@MapNode";
import {ArgumentType} from "Store/firebase/nodes/@MapNodeRevision";
import {emptyArray_forLoading, Assert, IsNaN} from "js-vextensions";
import {StoreAccessor} from "mobx-firelink";
import {GetParentNodeL3} from "../nodes";
import {Polarity} from "../nodes/@MapNode";
import {MapNodeType} from "../nodes/@MapNodeType";
import {GetNodeL3, GetNodeL2} from "../nodes/$node";

export const RS_CalculateTruthScore = StoreAccessor(s=>(claimID: string, calculationPath = [] as string[]): number=>{
	const claim = GetNodeL2(claimID);
	Assert(claim && claim.type == MapNodeType.Claim, "RS truth-score can only be calculated for a claim.");

	// if we've hit a cycle back to a claim we've already started calculating for (the root claim), consider the truth-score at this lower-location to be 100%
	if (calculationPath.length && calculationPath.indexOf(calculationPath.Last()) < calculationPath.length - 1) return 1;

	const childArguments = GetChildArguments(claim);
	if (childArguments == null || childArguments.length == 0) return 1;

	let runningAverage;
	let weightTotalSoFar = 0;
	for (const argument of childArguments) {
		const premises = GetNodeChildrenL3(argument).filter(a=>a && a.type == MapNodeType.Claim);
		if (premises.length == 0) continue;

		let truthScoreComposite = RS_CalculateTruthScoreComposite(argument._key, calculationPath.concat(argument._key));
		const weight = RS_CalculateWeight(argument._key, premises.map(a=>a._key), calculationPath.concat(argument._key));
		if (weight == 0) continue; // if 0 weight, this argument won't change the result at all, so skip it

		if (argument.finalPolarity == Polarity.Opposing) {
			truthScoreComposite = 1 - truthScoreComposite;
		}

		if (runningAverage == null) {
			weightTotalSoFar = weight;
			runningAverage = truthScoreComposite;
		} else {
			weightTotalSoFar += weight; // increase weight first
			const deviationFromAverage = truthScoreComposite - runningAverage;
			const weightRelativeToTotal = weight / weightTotalSoFar;
			runningAverage += deviationFromAverage * weightRelativeToTotal;
		}
		Assert(!IsNaN(runningAverage), "Got an NaN in truth-score calculation function.");
	}
	return runningAverage || 0;
});
export const RS_CalculateTruthScoreComposite = StoreAccessor(s=>(argumentID: string, calculationPath = [] as string[])=>{
	const argument = GetNodeL2(argumentID);
	Assert(argument && argument.type == MapNodeType.Argument, "RS truth-score-composite can only be calculated for an argument.");

	const premises = GetNodeChildrenL3(argument).filter(a=>a && a.type == MapNodeType.Claim);
	if (premises.length == 0) return 0;

	const truthScores = premises.map(premise=>RS_CalculateTruthScore(premise._key, calculationPath.concat(premise._key)));
	const truthScoreComposite = CombinePremiseTruthScores(truthScores, argument.current.argumentType);
	return truthScoreComposite;
});

export const RS_CalculateBaseWeight = StoreAccessor(s=>(claimID: string, calculationPath = [] as string[])=>{
	const truthScore = RS_CalculateTruthScore(claimID, calculationPath);
	// if truth-score drops below 50, it has 0 weight
	if (truthScore <= 0.5) return 0;

	const weight = (truthScore - 0.5) / 0.5;
	return weight;
});
export const RS_CalculateWeightMultiplier = StoreAccessor(s=>(nodeID: string, calculationPath = [] as string[])=>{
	const node = GetNodeL2(nodeID);
	Assert(node && node.type == MapNodeType.Argument, "RS weight-multiplier can only be calculated for an argument<>claim combo -- which is specified by providing its argument node.");

	const childArguments = GetChildArguments(node);
	if (childArguments == null || childArguments.length == 0) return 1;

	let runningMultiplier = 1;
	let runningDivisor = 1;
	for (const argument of childArguments) {
		const premises = GetNodeChildrenL3(argument).filter(a=>a && a.type == MapNodeType.Claim);
		if (premises.length == 0) continue;

		const truthScores = premises.map(premise=>RS_CalculateTruthScore(premise._key, calculationPath.concat(premise._key)));
		const truthScoresCombined = CombinePremiseTruthScores(truthScores, argument.current.argumentType);
		const weight = RS_CalculateWeight(argument._key, premises.map(a=>a._key), calculationPath.concat(argument._key));

		if (argument.finalPolarity == Polarity.Supporting) {
			runningMultiplier += truthScoresCombined * weight;
		} else {
			runningDivisor += truthScoresCombined * weight;
		}
	}
	return runningMultiplier / runningDivisor;
});
export const RS_CalculateWeight = StoreAccessor(s=>(argumentID: string, premiseIDs: string[], calculationPath = [] as string[])=>{
	const argument = GetNodeL2(argumentID);
	const premises = premiseIDs.map(id=>GetNodeL2(id));
	if (premises.length == 0) return 0;
	const baseWeightsProduct = premises.map(premise=>RS_CalculateBaseWeight(premise._key, calculationPath.concat(premise._key))).reduce((prev, cur)=>prev * cur);
	const weightMultiplier = RS_CalculateWeightMultiplier(argument._key, calculationPath);
	return baseWeightsProduct * weightMultiplier;
});

export type ReasonScoreValues = {argument, premises, argTruthScoreComposite, argWeightMultiplier, argWeight, claimTruthScore, claimBaseWeight};
export type ReasonScoreValues_RSPrefix = {argument, premises, rs_argTruthScoreComposite, rs_argWeightMultiplier, rs_argWeight, rs_claimTruthScore, rs_claimBaseWeight};
export const RS_GetAllValues = StoreAccessor(s=>(nodeID: string, path: string, useRSPrefix = false, calculationPath = [] as string[])=>{
	const node = GetNodeL2(nodeID);
	const parent = GetParentNodeL3(path);
	const argument = node.type == MapNodeType.Argument ? node : parent && parent.type == MapNodeType.Argument ? parent : null;
	const premises = node.type == MapNodeType.Argument ? GetNodeChildrenL3(argument, path).filter(a=>a && a.type == MapNodeType.Claim) : [node];

	if (node.type == MapNodeType.Claim) {
		var claimTruthScore = RS_CalculateTruthScore(node._key, calculationPath);
		var claimBaseWeight = RS_CalculateBaseWeight(node._key, calculationPath);
	}
	if (argument) { // (node could instead be a claim under category)
		var argTruthScoreComposite = RS_CalculateTruthScoreComposite(argument._key, calculationPath);
		var argWeightMultiplier = RS_CalculateWeightMultiplier(argument._key, calculationPath);
		var argWeight = RS_CalculateWeight(argument._key, premises.map(a=>a._key), calculationPath);
	}

	if (useRSPrefix) {
		return {
			argument, premises,
			rs_argTruthScoreComposite: argTruthScoreComposite, rs_argWeightMultiplier: argWeightMultiplier, rs_argWeight: argWeight,
			rs_claimTruthScore: claimTruthScore, rs_claimBaseWeight: claimBaseWeight,
		} as any;
	}
	return {argument, premises, argTruthScoreComposite, argWeightMultiplier, argWeight, claimTruthScore, claimBaseWeight} as ReasonScoreValues & ReasonScoreValues_RSPrefix;
});

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

const GetChildArguments = StoreAccessor(s=>(node: MapNodeL2): MapNodeL3[]=>{
	const children = GetNodeChildrenL3(node);
	if (children == emptyArray_forLoading || children.Any(a=>a == null)) return null; // null means still loading
	const childArguments = children.filter(a=>a.type == MapNodeType.Argument);
	for (const child of childArguments) {
		const childChildren = GetNodeChildrenL3(child);
		if (childChildren == emptyArray_forLoading || childChildren.Any(a=>a == null)) return null; // null means still loading
	}

	return childArguments;
});