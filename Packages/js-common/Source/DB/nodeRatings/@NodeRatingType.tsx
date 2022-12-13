import {Range, Assert, ModifyString, CE, CreateStringEnum, GetValues_ForSchema, GetValues, ToInt, IsInt} from "web-vcore/nm/js-vextensions.js";
import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";
import {GetDisplayPolarity, GetLinkUnderParent, GetNodeForm, IsMultiPremiseArgument} from "../nodes/$node.js";
import {NodeL2, NodeL3, Polarity} from "../nodes/@MapNode.js";
import {NodeType} from "../nodes/@NodeType.js";
import {ArgumentType} from "../nodes/@NodeRevision.js";

export enum NodeRatingType {
	significance = "significance",
	neutrality = "neutrality",
	truth = "truth",
	relevance = "relevance",
	impact = "impact",
}
//type NodeRatingType_flat = keyof typeof NodeRatingType;
AddSchema("NodeRatingType", {enum: GetValues(NodeRatingType)});

export function PropNameToTitle(propName: NodeRatingType) {
	return ModifyString(propName, m=>[m.lowerUpper_to_lowerSpaceLower, m.startLower_to_upper]);
}

export class ValueRange {
	constructor(data: Partial<ValueRange>) {
		Object.assign(this, data);
	}
	min: number;
	max: number;
	center: number; // if range is not even, round toward the global mid-point (ie. 50)
	label: string;
}
export function RatingValueIsInRange(value: number, range: ValueRange) {
	// mid-point is intentionally part of both leftSide and rightSide; this causes its range to be shrunk on both sides (achieving target behavior)
	const leftSide = range.min < 50;
	const rightSide = range.max > 50;

	let min_adjusted = range.min;
	let max_adjusted = range.max;
	// we use different logic on left and right sides; when value is exactly between two ranges, categorize it as being in the range farther from 50 (the mid-point)
	if (leftSide && min_adjusted != 0) min_adjusted += .001;
	if (rightSide && max_adjusted != 100) max_adjusted -= .001;
	
	return value >= min_adjusted && value <= max_adjusted;
}

export class RatingType_Info {
	constructor(initialData?: Partial<RatingType_Info>) {
		CE(this).VSet(initialData);
	}

	displayText: string;
	/*description: string | ((..._)=>JSX_Element);
	labels: number[];
	values: number[];
	tickInterval: number;*/
	valueRanges: ValueRange[];
}
export const baseRatingTypeInfo = {
	[NodeRatingType.significance]: new RatingType_Info({
		displayText: "Significance",
		valueRanges: GenerateValRangesFromLabels(["Pointless", "Unimportant", "Somewhat Important", "Important", "Extremely Important"]),
	}),
	[NodeRatingType.neutrality]: new RatingType_Info({
		displayText: "Neutrality",
		valueRanges: GenerateValRangesFromLabels(["Unbiased", "Slightly Biased", "Moderately Biased", "Highly Biased", "Extremely Biased"]),
	}),
	[NodeRatingType.truth]: new RatingType_Info({
		displayText: "Agreement",
		//valueLabels: {0: "Thoroughly false", 25: "Mostly false", 50: "Somewhat true", 75: "Mostly true", 100: "Thoroughly true"},
		//valueLabels: {0: "Strongly disagree", 20: "Disagree", 35: "Somewhat disagree", 50: "Neutral", 65: "Somewhat agree", 80: "Agree", 100: "Strongly agree"},
		valueRanges: GenerateValRangesFromLabels(["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"]),
		//valueLabels: {0: "Disagree (strongly)", 20: "Disagree", 35: "Disagree (somewhat)", 50: "Neutral", 65: "Agree (somewhat)", 80: "Agree", 100: "Agree (strongly)"},
	}),
	[NodeRatingType.relevance]: new RatingType_Info({
		displayText: "Relevance",
		//valueRanges: GenerateValRangesFromLabels(["Completely Irrelevant", "Slightly Relevant", "Moderately Relevant", "Highly Relevant", "Extremely Relevant"]),
		valueRanges: GenerateValRangesFromLabels(["Not Relevant", "Slightly Relevant", "Somewhat Relevant", "Relevant", "Substantially Relevant", "Highly Relevant", "Extremely Relevant"]),
	}),
	[NodeRatingType.impact]: new RatingType_Info({
		displayText: "Impact",
		//valueRanges: GenerateValRangesFromLabels(["Thoroughly False", "Mostly False", "Somewhat True", "Mostly True", "Game-Changer"]),
		valueRanges: GenerateValRangesFromLabels(["[unnamed range]"]), // must have one range entry, so UpdateNodeRatingSummaries() can store the impact-rating count, with consistent code
	}),
};

export function GetRatingTypeInfo(ratingType: NodeRatingType, node?: NodeL3, parent?: NodeL3|n, path?: string) {
	return baseRatingTypeInfo[ratingType];
}

function GenerateValRangesFromLabels(labels: string[]) {
	let ranges: [number, number][];
	if (labels.length == 1) {
		ranges = [
			[0, 100],		// center: 50
		];
	} else if (labels.length == 5) {
		// range covered by each entry: 20 [100/5 = 20]
		ranges = [
			[0, 20],		// center: 10
			[20, 40],	// center: 30
			[40, 60],	// center: 50
			[60, 80],	// center: 70
			[80, 100],	// center: 90
		];
	} else if (labels.length == 7) {
		// range covered by each entry: 14 (other than first and last, which each cover 15) [100/5 = 14.2857142857]
		ranges = [
			[0, 15],		// center: 8 (rounded up, since 50 is anchor)
			[15, 29],	// center: 22
			[29, 43],	// center: 36
			[43, 57],	// center: 50
			[57, 71],	// center: 64
			[71, 85],	// center: 78
			[85, 100],	// center: 92 (rounded down, since 50 is anchor)
		];
	} else {
		Assert(false, `Label-count (${labels.length}) doesn't match any of the implemented values (1,5,7).`);
	}
	return ranges.map((range, index)=>{
		const label = labels[index];
		//const rangeDist = range[1] - range[0];
		const center_fractional = range.Average();
		return new ValueRange({
			min: range[0],
			max: range[1],
			center:
				IsInt(center_fractional) ? center_fractional : // if average is int, use that
				range[0] < 50 ? ToInt(center_fractional) + 1 : // else, if below 50 (anchor), round up toward it
				ToInt(center_fractional), // else, must be below 50 (anchor), so round down toward it
			label,
		});
	});
}