import {Range} from "../../../../Frame/General/Globals";
import {MapNode, MetaThesis_IfType, MetaThesis_ThenType} from "../MapNode";
import {MapNodeType} from "../MapNodeType";

export type RatingType = "significance" | "probability" | "idealIntensity" | "adjustment";
export class RatingType_Info {
	static for = {
		significance: new RatingType_Info({
			displayText: "Significance",
			description: ()=>"How significant/important is this subject, relative to the others on this site?",
			options: ()=>Range(0, 100),
			ticks: ()=>Range(0, 100, 5),
		}),
		probability: new RatingType_Info({
			displayText: "Probability",
			description: ()=>"What probability does this statement, as presented, have of being true?",
			//options: [1, 2, 4, 6, 8].concat(Range(10, 90, 5)).concat([92, 94, 96, 98, 99]),
			//options: [1].concat(Range(2, 98, 2)).concat([99]),
			/*options: Range(1, 99),
			ticks: [1].concat(Range(5, 95, 5)).concat([99]),*/
			options: ()=>Range(0, 100),
			ticks: ()=>Range(0, 100, 5),
		}),
		idealIntensity: new RatingType_Info({
			displayText: "Ideal intensity",
			description: ()=>"What intensity should this statement be strengthened/weakened to, to reach its ideal state? (making substantial claims while maintaining accuracy)",
			/*options: [1, 2, 4, 6, 8].concat(Range(10, 200, 5)),
			ticks: [1].concat(Range(20, 200, 20)),*/
			options: ()=>Range(0, 200),
			ticks: ()=>Range(0, 200, 10),
		}),
		/*weight: {
			description: "TODO",
			options: Range(0, 100),
			ticks: Range(0, 100, 5),
		},*/
		// todo
		/*substantiation: {
			description: "How much would the parent thesis be substantiated, IF all the (non-meta) theses of this argument were true?",
			options: Range(0, 100),
			ticks: Range(0, 100, 5),
		},*/
		adjustment: new RatingType_Info({
			displayText: "Adjustment",
			description: (node, parentNode)=> {
				let ifType_str = MetaThesis_IfType[node.metaThesis_ifType].toLowerCase();
				let support = parentNode.type == MapNodeType.SupportingArgument;
				/*var raiseOrLower = parentNode.type == MapNodeType.SupportingArgument ? "raise" : "lower";
				return `Supposing that ${ifType_str} premises of this argument were true, and the parent thesis' prior probability were 50%, to what level would this argument ${
					raiseOrLower} it?`;*/
				/*return `Suppose that the other ${supporting ? "supporting" : "opposing"} arguments were only strong enough to yield a 50% probability for the parent`
					+ ` (relative to the ${supporting ? "opposing" : "supporting"} arguments, which were kept the same).`
					+ ` Assuming that all premises of this argument were true, to what level would it ${supporting ? "raise" : "lower"} the parent thesis' probability?`;*/
				return `Suppose that the ${support ? "opposing" : "supporting"}  arguments were only strong enough`
					+ ` to bring the parent's probability ${support ? "down" : "up"} to 50%.`
					+ ` Suppose also that this were the only ${support ? "supporting" : "opposing"} argument, but that its premises were all true.`
					+ ` If that were the case, to what level would this argument ${support ? "raise" : "lower"} the parent thesis' probability?`;
				/*return `Suppose that all premises of this argument were true.`
					+ ` If that were the case, how strong would this argument be relative to all of its peers (both supporting and opposing)?`;*/
			},
			options: (node, parentNode)=> {
				return parentNode.type == MapNodeType.SupportingArgument ? Range(50, 100) : Range(0, 50);
			},
			ticks: (node, parentNode)=> {
				return parentNode.type == MapNodeType.SupportingArgument ? Range(50, 100, 5) : Range(0, 50, 5);
			},
		}),
	} as {[key: string]: RatingType_Info};

	private constructor(info: Partial<RatingType_Info>) {
		this.Extend(info);
	}

	displayText: string;
	description: ((node: MapNode, parentNode: MapNode)=>string);
	options: ((node: MapNode, parentNode: MapNode)=>number[]);
	ticks: ((node: MapNode, parentNode: MapNode)=>number[]);; // for x-axis labels
}