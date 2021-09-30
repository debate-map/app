import {Range, Assert, ModifyString, CE, CreateStringEnum, GetValues_ForSchema, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";
import {GetDisplayPolarity, GetLinkUnderParent, GetNodeForm, IsMultiPremiseArgument} from "../nodes/$node.js";
import {MapNodeL2, MapNodeL3, Polarity} from "../nodes/@MapNode.js";
import {MapNodeType} from "../nodes/@MapNodeType.js";
import {ArgumentType} from "../nodes/@MapNodeRevision.js";

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

export class RatingType_Info {
	constructor(initialData?: Partial<RatingType_Info>) {
		CE(this).VSet(initialData);
	}

	displayText: string;
	/*description: string | ((..._)=>JSX_Element);
	labels: number[];
	values: number[];
	tickInterval: number;*/
	values: {[key: number]: string};
}
export const baseRatingTypeInfo = {
	[NodeRatingType.significance]: new RatingType_Info({
		displayText: "Significance",
		values: {0: "Pointless", 25: "Unimportant", 50: "Somewhat important", 75: "Important", 100: "Extremely important"},
	}),
	[NodeRatingType.neutrality]: new RatingType_Info({
		displayText: "Neutrality",
		values: {0: "Completely biased", 25: "Heavily biased", 50: "Somewhat biased", 75: "Mostly impartial", 100: "Completely impartial"},
	}),
	[NodeRatingType.truth]: new RatingType_Info({
		displayText: "Agreement",
		//values: {0: "Thoroughly false", 25: "Mostly false", 50: "Somewhat true", 75: "Mostly true", 100: "Thoroughly true"},
		//values: {0: "Strongly disagree", 20: "Disagree", 35: "Somewhat disagree", 50: "Neutral", 65: "Somewhat agree", 80: "Agree", 100: "Strongly agree"},
		values: {0: "Strongly Disagree", 20: "Disagree", 35: "Somewhat Disagree", 50: "Neutral", 65: "Somewhat Agree", 80: "Agree", 100: "Strongly Agree"},
		//values: {0: "Disagree (strongly)", 20: "Disagree", 35: "Disagree (somewhat)", 50: "Neutral", 65: "Agree (somewhat)", 80: "Agree", 100: "Agree (strongly)"},
	}),
	[NodeRatingType.relevance]: new RatingType_Info({
		displayText: "Relevance",
		values: {0: "Completely irrelevant", 25: "Slightly relevant", 50: "Relevant", 75: "Highly relevant", 100: "Extremely relevant"},
	}),
	[NodeRatingType.impact]: new RatingType_Info({
		displayText: "Impact",
		values: {0: "Thoroughly false", 25: "Mostly false", 50: "Somewhat true", 75: "Mostly true", 100: "Game-changer"},
	}),
};

export function GetRatingTypeInfo(ratingType: NodeRatingType, node?: MapNodeL3, parent?: MapNodeL3|n, path?: string) {
	return baseRatingTypeInfo[ratingType];
}