import {MapNode, MapNodeEnhanced} from "../nodes/@MapNode";
import {Range} from "js-vextensions";
import {MapNodeType} from "../nodes/@MapNodeType";
import {MetaThesis_IfType} from "../nodes/@MetaThesisInfo";
import {GetNodeForm, GetMainRatingType, GetNodeEnhanced} from "../nodes/$node";
import {GetNode} from "../nodes";
import InfoButton from "../../../Frame/ReactComponents/InfoButton";
import {SplitStringBySlash_Cached} from "Frame/Database/StringSplitCache";
import {SlicePath} from "../../../Frame/Database/DatabaseHelpers";
import { PropNameToTitle } from "Frame/General/Others";

//export type RatingType = "significance" | "neutrality" | "probability" | "intensity" | "adjustment" | "strength";
//export type RatingType = "significance" | "neutrality" | "probability" | "support" | "adjustment" | "strength";
export const ratingTypes = ["significance", "neutrality", "probability", "degree", "adjustment", "strength"];
export type RatingType = "significance" | "neutrality" | "probability" | "degree" | "adjustment" | "strength";

export function GetRatingTypeInfo(ratingType: RatingType, node: MapNode, parent: MapNode, path: string) {
	let result = new RatingType_Info();
	result.displayText = PropNameToTitle(ratingType);
	result.labels = Range(0, 100);
	result.values = Range(0, 100);
	result.tickInterval = 5;

	if (ratingType == "significance") {
		result.description = "How significant/important is this subject? (0: not worth any time discussing, 100: vital to discuss)";
	} else if (ratingType == "neutrality") {
		result.description = `How neutral/impartial is the phrasing of this statement/question? (0: as biased as they come, 100: no bias)`;
	} else if (ratingType == "probability") {
		//result.description = "Suppose you were as sure as you are right now (of this thesis being true, in its basic form), 100 different times (on different topics). How many of those times do you expect you'd be correct?";
		result.description = "Consider how sure you are of this statement being true (in its basic form). If you were this sure 100 times (on a variety of things), how many of those times do you think you'd be correct?";
	} else if (ratingType == "degree") {
		result.description = "To what degree do you consider this statement true? (0: completely false, 50: true to a basic extent, 100: true to the highest extent)";
	} else if (ratingType == "strength") {
		result.description = "Argument strength is calculated based on the probabilities of its premises, and the probability/adjustment of its meta-thesis.";
	} else if (ratingType == "adjustment") {
		Assert(parent, `Invalid state. Node with rating-type "adjustment" must have a "parent" argument passed alongside. @path:${path}`);
		Assert(node.metaThesis, `Invalid state. Node with rating-type "adjustment" should have a metaThesis property attached. @path:${path}`);

		let grandParentID = SplitStringBySlash_Cached(path).length >= 3 ? SplitStringBySlash_Cached(path).XFromLast(2).ToInt() : null;
		let grandParent = grandParentID ? GetNodeEnhanced(GetNode(grandParentID), SlicePath(path, 2)) : null;
		let grandParentRatingType = grandParent ? GetMainRatingType(grandParent) : "probability";

		let premiseCountrStrMap = {All: `all of the premises`, AnyTwo: `at least two of the premises`, Any: `at least one of the premises.`};
		//let premiseCountrStrMap = {All: `all of its premises`, AnyTwo: `at least two of its premises`, Any: `at least one of its premises.`};
		let premiseCountStr = premiseCountrStrMap[MetaThesis_IfType[node.metaThesis.ifType]];
		let shiftType = parent.type == MapNodeType.SupportingArgument ? "raise" : "lower";

		/*return (
			<span>
				Suppose this were the only argument (ie. line of support or opposition) specifically on this subject.
				<br/>Suppose also that {premiseCountStr} are 100% true/full.
				<br/>If so, how much should it {shiftType} the {grandParentRatingType} rating of someone whose initial evaluation was 50%?
			</span>
		);*/
		/*return (
			<span>
				Suppose that {premiseCountStr} of this argument were 100% true/full.
				<br/>If so, how much should it {shiftType} the {grandParentRatingType} rating of someone whose initial evaluation was 50%?
			</span>
		);*/

		if (grandParentRatingType == "adjustment" && parent.type == MapNodeType.OpposingArgument) {
			result.description = (
				<span>
					If {premiseCountStr} of this argument were true (to the highest extent), how much would it weaken/undo the adjustment factor of the parent thesis?
				</span>
			);
		} else {
			result.description = (
				<span>
					If {premiseCountStr} of this argument were true (to the highest extent), to what level should it {shiftType} someone's {grandParentRatingType
						} rating of the parent thesis? (assuming their initial evaluation were 50%)
				</span>
			);
			let supporting = (parent["finalType"] || parent.type) == MapNodeType.SupportingArgument;
			result.labels = supporting ? Range(50, 100) : Range(0, 50);
			//result.values = supporting ? Range(0, 100, 2) : Range(100, 0, 2);
			result.values = supporting ? Range(0, 100, 2) : Range(0, 100, 2).reverse();
		}
	} else {
		Assert(false, `Invalid rating type: ${ratingType}`);
	}

	return result;
}

/*intensity: new RatingType_Info({
	displayText: "Intensity",
	//description: ()=>"What intensity should this statement be strengthened/weakened to, to reach its ideal state? (making substantial claims while maintaining accuracy)",
	//description: ()=>"To what intensity is this statement true? (100 = your estimate of the average opinion)",
	description: ()=>"To what intensity is the basic idea true? (100: your estimate of the average opinion)",
	/*options: [1, 2, 4, 6, 8].concat(Range(10, 200, 5)),
	ticks: [1].concat(Range(20, 200, 20)),*#/
	options: ()=>Range(0, 200),
	ticks: ()=>Range(0, 200, 10),
}),*/
/*evidence: new RatingType_Info({
	displayText: "Evidence",
	description: ()=>"To what level should the average opinion on this statement be shifted to match the evidence?",
	options: ()=>Range(0, 200),
	ticks: ()=>Range(0, 200, 10),
}),*/
/*backing: new RatingType_Info({
	displayText: "Backing",
	description: ()=>"How strong is the backing/evidence for this statement? (100: your estimate of the average opinion)",
	options: ()=>Range(0, 200),
	ticks: ()=>Range(0, 200, 10),
}),*/
/*correction: new RatingType_Info({
	displayText: "Correction",
	description: ()=>"How much should the average opinion on this statement be shifted to be most reasonable?",
	options: ()=>Range(-100, 100),
	ticks: ()=>Range(-100, 100, 10),
}),*/
/*support: new RatingType_Info({
	displayText: "Support",
	description: ()=>"Where do you consider your views on this statement, relative to the rest of the population? (-100: very critical, 0: neither critical nor supportive, +100: very supportive)",
	options: ()=>Range(-100, 100),
	ticks: ()=>Range(-100, 100, 10),
	//tickFormatter: tick=>(tick < 0 ? "-" : tick > 1 ? "+" : "") + tick.Distance(0) //+ "%"
	tickRender: props=> {
		let {x, y, stroke, fill, payload} = props;
		let tick = payload.value;
		let tickStr = (tick < 0 ? "-" : tick == 0 ? "" : "+") + tick.Distance(0);
		return (
			<g transform={`translate(${x},${y - 5})`}>
				<text x={0} y={0} dy={16} stroke={stroke} fill="#AAA"
						textAnchor={"end"}
						transform={"rotate(-25)"}>
					{tickStr}
				</text>
			</g>
		);
	}
}),*/

export class RatingType_Info {
	constructor(info?: Partial<RatingType_Info>) {
		this.Extend(info);
	}

	displayText: string;
	description: string | JSX.Element;
	labels: number[];
	values: number[];
	tickInterval: number;
	//tickFormatter?: (tickValue: number)=>string = a=>a.toString();
	tickRender?: (props: TickRenderProps)=>JSX.Element;
	/*tickRender?: (props: TickRenderProps)=>JSX.Element = props=> {
		let {x, y, stroke, fill, payload} = props;
		let tickStr = payload.value + "%";
		return (
			<g transform={`translate(${x},${y - 5})`}>
				<text x={0} y={0} dy={16} stroke={stroke} fill="#AAA"
						textAnchor={"middle"}
						transform={"rotate(-25)"}>
					{tickStr}
				</text>
			</g>
		);
	}*/
	/*tickRender?: (props: TickRenderProps)=>JSX.Element = props=> {
		let {x, y, stroke, fill, payload} = props;
		let tickStr = payload.value + "%";
		return (
			<g transform={`translate(${x},${y - 5})`}>
				<text x={0} y={0} dy={16} stroke={stroke} fill="#AAA" textAnchor={"middle"}>
					{tickStr}
				</text>
				<text x={0} y={10} dy={16} stroke={stroke} fill="#AAA" textAnchor={"middle"}>
					{"%"}
				</text>
			</g>
		);
	}*/
}

type TickRenderProps = {
	fill: string,
	height: number,
	index: number,
	payload,
	stroke: string,
	textAnchor: string,
	verticalAnchor: string,
	viewBox,
	width: number,
	x: number,
	y: number,
}