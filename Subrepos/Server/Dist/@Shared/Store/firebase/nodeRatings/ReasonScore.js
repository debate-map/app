import { emptyArray_forLoading, Assert, IsNaN, CE } from "js-vextensions";
import { StoreAccessor } from "mobx-firelink";
import { MapNodeType } from "../nodes/@MapNodeType";
import { GetNodeL2 } from "../nodes/$node";
import { GetNodeChildrenL3, GetParentNodeL3 } from "../nodes";
import { Polarity } from "../nodes/@MapNode";
import { ArgumentType } from "../nodes/@MapNodeRevision";
export const RS_CalculateTruthScore = StoreAccessor(s => (claimID, calculationPath = []) => {
    const claim = GetNodeL2(claimID);
    Assert(claim && claim.type == MapNodeType.Claim, "RS truth-score can only be calculated for a claim.");
    // if we've hit a cycle back to a claim we've already started calculating for (the root claim), consider the truth-score at this lower-location to be 100%
    if (calculationPath.length && calculationPath.indexOf(calculationPath.Last()) < calculationPath.length - 1)
        return 1;
    const childArguments = GetChildArguments(claim._key);
    if (childArguments == null || childArguments.length == 0)
        return 1;
    let runningAverage;
    let weightTotalSoFar = 0;
    for (const argument of childArguments) {
        const premises = GetNodeChildrenL3(argument._key).filter(a => a && a.type == MapNodeType.Claim);
        if (premises.length == 0)
            continue;
        let truthScoreComposite = RS_CalculateTruthScoreComposite(argument._key, calculationPath.concat(argument._key));
        const weight = RS_CalculateWeight(argument._key, premises.map(a => a._key), calculationPath.concat(argument._key));
        if (weight == 0)
            continue; // if 0 weight, this argument won't change the result at all, so skip it
        if (argument.displayPolarity == Polarity.Opposing) {
            truthScoreComposite = 1 - truthScoreComposite;
        }
        if (runningAverage == null) {
            weightTotalSoFar = weight;
            runningAverage = truthScoreComposite;
        }
        else {
            weightTotalSoFar += weight; // increase weight first
            const deviationFromAverage = truthScoreComposite - runningAverage;
            const weightRelativeToTotal = weight / weightTotalSoFar;
            runningAverage += deviationFromAverage * weightRelativeToTotal;
        }
        Assert(!IsNaN(runningAverage), "Got an NaN in truth-score calculation function.");
    }
    return runningAverage || 0;
});
export const RS_CalculateTruthScoreComposite = StoreAccessor(s => (argumentID, calculationPath = []) => {
    const argument = GetNodeL2(argumentID);
    Assert(argument && argument.type == MapNodeType.Argument, "RS truth-score-composite can only be calculated for an argument.");
    const premises = GetNodeChildrenL3(argument._key).filter(a => a && a.type == MapNodeType.Claim);
    if (premises.length == 0)
        return 0;
    const truthScores = premises.map(premise => RS_CalculateTruthScore(premise._key, calculationPath.concat(premise._key)));
    const truthScoreComposite = CombinePremiseTruthScores(truthScores, argument.current.argumentType);
    return truthScoreComposite;
});
export const RS_CalculateBaseWeight = StoreAccessor(s => (claimID, calculationPath = []) => {
    const truthScore = RS_CalculateTruthScore(claimID, calculationPath);
    // if truth-score drops below 50, it has 0 weight
    if (truthScore <= 0.5)
        return 0;
    const weight = (truthScore - 0.5) / 0.5;
    return weight;
});
export const RS_CalculateWeightMultiplier = StoreAccessor(s => (nodeID, calculationPath = []) => {
    const node = GetNodeL2(nodeID);
    Assert(node && node.type == MapNodeType.Argument, "RS weight-multiplier can only be calculated for an argument<>claim combo -- which is specified by providing its argument node.");
    const childArguments = GetChildArguments(node._key);
    if (childArguments == null || childArguments.length == 0)
        return 1;
    let runningMultiplier = 1;
    let runningDivisor = 1;
    for (const argument of childArguments) {
        const premises = GetNodeChildrenL3(argument._key).filter(a => a && a.type == MapNodeType.Claim);
        if (premises.length == 0)
            continue;
        const truthScores = premises.map(premise => RS_CalculateTruthScore(premise._key, calculationPath.concat(premise._key)));
        const truthScoresCombined = CombinePremiseTruthScores(truthScores, argument.current.argumentType);
        const weight = RS_CalculateWeight(argument._key, premises.map(a => a._key), calculationPath.concat(argument._key));
        if (argument.displayPolarity == Polarity.Supporting) {
            runningMultiplier += truthScoresCombined * weight;
        }
        else {
            runningDivisor += truthScoresCombined * weight;
        }
    }
    return runningMultiplier / runningDivisor;
});
export const RS_CalculateWeight = StoreAccessor(s => (argumentID, premiseIDs, calculationPath = []) => {
    const argument = GetNodeL2(argumentID);
    const premises = premiseIDs.map(id => GetNodeL2(id));
    if (premises.length == 0)
        return 0;
    const baseWeightsProduct = premises.map(premise => RS_CalculateBaseWeight(premise._key, calculationPath.concat(premise._key))).reduce((prev, cur) => prev * cur);
    const weightMultiplier = RS_CalculateWeightMultiplier(argument._key, calculationPath);
    return baseWeightsProduct * weightMultiplier;
});
export const RS_GetAllValues = StoreAccessor(s => (nodeID, path, useRSPrefix = false, calculationPath = []) => {
    const node = GetNodeL2(nodeID);
    const parent = GetParentNodeL3(path);
    const argument = node.type == MapNodeType.Argument ? node : parent && parent.type == MapNodeType.Argument ? parent : null;
    const premises = node.type == MapNodeType.Argument ? GetNodeChildrenL3(argument._key, path).filter(a => a && a.type == MapNodeType.Claim) : [node];
    if (node.type == MapNodeType.Claim) {
        var claimTruthScore = RS_CalculateTruthScore(node._key, calculationPath);
        var claimBaseWeight = RS_CalculateBaseWeight(node._key, calculationPath);
    }
    if (argument) { // (node could instead be a claim under category)
        var argTruthScoreComposite = RS_CalculateTruthScoreComposite(argument._key, calculationPath);
        var argWeightMultiplier = RS_CalculateWeightMultiplier(argument._key, calculationPath);
        var argWeight = RS_CalculateWeight(argument._key, premises.map(a => a._key), calculationPath);
    }
    if (useRSPrefix) {
        return {
            argument, premises,
            rs_argTruthScoreComposite: argTruthScoreComposite, rs_argWeightMultiplier: argWeightMultiplier, rs_argWeight: argWeight,
            rs_claimTruthScore: claimTruthScore, rs_claimBaseWeight: claimBaseWeight,
        };
    }
    return { argument, premises, argTruthScoreComposite, argWeightMultiplier, argWeight, claimTruthScore, claimBaseWeight };
});
function CombinePremiseTruthScores(truthScores, argumentType) {
    if (argumentType == ArgumentType.All) {
        return truthScores.reduce((prev, cur) => prev * cur);
    }
    if (argumentType == ArgumentType.AnyTwo) {
        if (truthScores.length < 2)
            return 0;
        let highestTruthScore = CE(truthScores).Max();
        let otherTruthScores = CE(truthScores).Except({ excludeEachOnlyOnce: true }, highestTruthScore);
        let secondHighestTruthScore = CE(otherTruthScores).Max();
        return highestTruthScore * secondHighestTruthScore;
    }
    return CE(truthScores).Max(); // ArgumentType.Any
}
const GetChildArguments = StoreAccessor(s => (nodeID) => {
    const children = GetNodeChildrenL3(nodeID);
    if (children == emptyArray_forLoading || CE(children).Any(a => a == null))
        return null; // null means still loading
    const childArguments = children.filter(a => a.type == MapNodeType.Argument);
    for (const child of childArguments) {
        const childChildren = GetNodeChildrenL3(nodeID);
        if (childChildren == emptyArray_forLoading || CE(childChildren).Any(a => a == null))
            return null; // null means still loading
    }
    return childArguments;
});
