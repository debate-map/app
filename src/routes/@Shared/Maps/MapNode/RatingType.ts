import {Range} from "../../../../Frame/General/Globals";
import {MapNodeType, MapNode} from "../MapNode";

export type RatingType = "significance" | "probability" | "adjustment";
export class RatingType_Info {
	static for = {
		significance: new RatingType_Info({
			description: "TODO",
			options: Range(0, 100),
			ticks: Range(0, 100, 5),
		}),
		probability: new RatingType_Info({
			description: "What probability does this statement, as presented, have of being true?",
			//options: [1, 2, 4, 6, 8].concat(Range(10, 90, 5)).concat([92, 94, 96, 98, 99]),
			//options: [1].concat(Range(2, 98, 2)).concat([99]),
			/*options: Range(1, 99),
			ticks: [1].concat(Range(5, 95, 5)).concat([99]),*/
			options: Range(0, 100),
			ticks: Range(0, 100, 5),
		}),
		adjustment: new RatingType_Info({
			description: "What intensity should this statement be strengthened/weakened to, to reach its ideal state? (making substantial claims while maintaining accuracy)",
			/*options: [1, 2, 4, 6, 8].concat(Range(10, 200, 5)),
			ticks: [1].concat(Range(20, 200, 20)),*/
			options: Range(0, 200),
			ticks: Range(0, 200, 10),
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
		strengthIfTrue: new RatingType_Info({
			description: parentNode=> {
				var type = parentNode.type == MapNodeType.SupportingArgument ? "raise" : "lower";
				return `If all the premises of this argument were true, and the parent thesis' prior probability were 50%, to what level would this argument ${type} it?`;
			},
			options: Range(0, 100),
			ticks: Range(0, 100, 5),
		}),
	} as {[key: string]: RatingType_Info};

	private constructor(info: Partial<RatingType_Info>) {
		this.Extend(info);
	}

	description: string | ((parentNode: MapNode)=>string);
	options: number[];
	ticks: number[]; // for x-axis labels
}