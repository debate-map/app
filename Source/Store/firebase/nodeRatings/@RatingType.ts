import {MapNode, MetaThesis_IfType} from "../nodes/@MapNode";
import {Range} from "../../../Frame/General/Globals";
import {MapNodeType} from "../nodes/@MapNodeType";

export type RatingType = "significance" | "neutrality" | "probability" | "idealIntensity" | "adjustment" | "strength";
export class RatingType_Info {
	static for = {
		significance: new RatingType_Info({
			displayText: "Significance",
			description: ()=>"How significant/important is this subject? (0 = not worth any time discussing; 100 = vital to discuss)",
			options: ()=>Range(0, 100),
			ticks: ()=>Range(0, 100, 5),
		}),
		neutrality: new RatingType_Info({
			displayText: "Neutrality",
			description: ()=>"How neutral/impartial is the phrasing of this question? (0 = as biased as they come; 100 = no bias)",
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
		// todo
		/*substantiation: {
			description: "How much would the parent thesis be substantiated, IF all the (non-meta) theses of this argument were true?",
			options: Range(0, 100),
			ticks: Range(0, 100, 5),
		},*/
		adjustment: new RatingType_Info({
			displayText: "Adjustment",
			description: (node, parentNode)=> {
				/*let ifType_str = MetaThesis_IfType[node.metaThesis.ifType].toLowerCase();
				var raiseOrLower = parentNode.type == MapNodeType.SupportingArgument ? "raise" : "lower";
				return `Supposing that ${ifType_str} premises of this argument were true, and the parent thesis' prior probability were 50%, to what level would this argument ${
					raiseOrLower} it?`;*/
				let all = node.metaThesis.ifType == MetaThesis_IfType.All;
				let support = parentNode.type == MapNodeType.SupportingArgument;
				/*return `Suppose that the other ${supporting ? "supporting" : "opposing"} arguments were only strong enough to yield a 50% probability for the parent`
					+ ` (relative to the ${supporting ? "opposing" : "supporting"} arguments, which were kept the same).`
					+ ` Assuming that all premises of this argument were true, to what level would it ${supporting ? "raise" : "lower"} the parent thesis' probability?`;*/
				/*return `Suppose that all premises of this argument were true.`
					+ ` If that were the case, how strong would this argument be relative to all of its peers (both supporting and opposing)?`;*/
				/*return `Suppose that the ${support ? "opposing" : "supporting"}  arguments were only strong enough`
					+ ` to bring the parent's probability ${support ? "down" : "up"} to 50%.`
					+ ` Suppose also that this were the only ${support ? "supporting" : "opposing"} argument, but that its premises were all true.`
					+ ` If that were the case, to what level would this argument ${support ? "raise" : "lower"} the parent thesis' probability?`;*/
				return `Suppose that the other arguments -- supporting and opposing -- were equal in strength, so that the parent's probability were 50%.`
					+ (all ? ` Suppose also that this argument's premises were all true.` : ` Suppose also that at least one of this argument's premises were true.`)
					+ ` If that were the case, to what level would this argument ${support ? "raise" : "lower"} the parent thesis' probability?`;
			},
			options: (node, parentNode)=> {
				return parentNode.type == MapNodeType.SupportingArgument ? Range(50, 100) : Range(0, 50);
			},
			ticks: (node, parentNode)=> {
				return parentNode.type == MapNodeType.SupportingArgument ? Range(50, 100, 5) : Range(0, 50, 5);
			},
		}),
		strength: {
			displayText: "Strength",
			description: ()=>"Argument strength is calculated based on the probabilities of its premises, and the probability/adjustment of its meta-thesis.",
			options: ()=>Range(0, 100),
			ticks: ()=>Range(0, 100, 5),
		},
	} as {[key: string]: RatingType_Info};

	private constructor(info: Partial<RatingType_Info>) {
		this.Extend(info);
	}

	displayText: string;
	description: ((node: MapNode, parentNode: MapNode)=>string);
	options: ((node: MapNode, parentNode: MapNode)=>number[]);
	ticks: ((node: MapNode, parentNode: MapNode)=>number[]);; // for x-axis labels
}