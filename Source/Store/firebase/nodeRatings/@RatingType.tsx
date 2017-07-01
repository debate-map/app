import {MapNode, MapNodeEnhanced} from "../nodes/@MapNode";
import {Range} from "../../../Frame/General/Globals";
import {MapNodeType} from "../nodes/@MapNodeType";
import {MetaThesis_IfType} from "../nodes/@MetaThesisInfo";
import {GetNodeForm, GetMainRatingType, GetNodeEnhanced} from "../nodes/$node";
import {GetNode} from "../nodes";
import InfoButton from "../../../Frame/ReactComponents/InfoButton";
import {SplitStringBySlash_Cached} from "Frame/Database/StringSplitCache";
import {SlicePath} from "../../../Frame/Database/DatabaseHelpers";

//export type RatingType = "significance" | "neutrality" | "probability" | "intensity" | "adjustment" | "strength";
//export type RatingType = "significance" | "neutrality" | "probability" | "support" | "adjustment" | "strength";
export type RatingType = "significance" | "neutrality" | "probability" | "degree" | "adjustment" | "strength";
export class RatingType_Info {
	static for = {
		significance: new RatingType_Info({
			displayText: "Significance",
			description: ()=>"How significant/important is this subject? (0: not worth any time discussing, 100: vital to discuss)",
			options: ()=>Range(0, 100),
			ticks: ()=>Range(0, 100, 5),
		}),
		neutrality: new RatingType_Info({
			displayText: "Neutrality",
			description: (node, parentNode)=> {
				//let form = node.type == MapNodeType.Thesis ? GetNodeForm(node, path) : null;
				return `How neutral/impartial is the phrasing of this statement/question? (0: as biased as they come, 100: no bias)`;
			},
			options: ()=>Range(0, 100),
			ticks: ()=>Range(0, 100, 5),
		}),
		probability: new RatingType_Info({
			displayText: "Probability",
			description: ()=>"Suppose you were as sure as you are right now (of this thesis being true, in its basic form), 100 different times (on different topics). How many of those times would you expect to be correct?",
			//options: [1, 2, 4, 6, 8].concat(Range(10, 90, 5)).concat([92, 94, 96, 98, 99]),
			//options: [1].concat(Range(2, 98, 2)).concat([99]),
			/*options: Range(1, 99),
			ticks: [1].concat(Range(5, 95, 5)).concat([99]),*/
			options: ()=>Range(0, 100),
			ticks: ()=>Range(0, 100, 5),
		}),
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
		degree: new RatingType_Info({
			displayText: "Degree",
			description: ()=>"To what degree do you consider this statement true? (0: completely false, 50: true in its basic form, 100: true in its full form)",
			options: ()=>Range(0, 100),
			ticks: ()=>Range(0, 100, 5),
		}),
		adjustment: new RatingType_Info({
			displayText: "Adjustment",
			description: (node, parent, path)=> {
				let grandParentID = SplitStringBySlash_Cached(path).length >= 3 ? SplitStringBySlash_Cached(path).XFromLast(2).ToInt() : null;
				let grandParent = grandParentID ? GetNodeEnhanced(GetNode(grandParentID), SlicePath(path, 2)) : null;
				let grandParentRatingType = grandParent ? GetMainRatingType(grandParent) : "probability";
				/*return `Suppose someone is completely on the fence on the parent thesis -- giving it a 50% ${
					grandParentRatingType == "probability" ? "probability" : grandParentRatingType + " rating"}.`
					+ (
						node.metaThesis.ifType == MetaThesis_IfType.All ? ` Suppose also that you introduce this argument to them, and they accept all of the premises.` :
						node.metaThesis.ifType == MetaThesis_IfType.AnyTwo ? ` Suppose also that you introduce this argument to them, and they accept at least two of the premises.` :
						` Suppose also that you introduce this argument to them, and they accept at least one of the premises.`
					)
					+ ` To what level would you expect them (assuming they're reasonable) to shift their ${grandParentRatingType} rating?`;*/
				let premiseCountrStrMap = {All: `all of the premises`, AnyTwo: `at least two of the premises`, Any: `at least one of the premises.`};
				let premiseCountStr = premiseCountrStrMap[MetaThesis_IfType[node.metaThesis.ifType]];
				return (
					<span>
						Suppose someone is completely on the fence on the parent thesis -- giving it a 50% {
							grandParentRatingType == "probability" ? "probability" : grandParentRatingType + " rating"}.
						<br/>Suppose you then introduce this argument to them, and they accept {premiseCountStr}.
						<InfoButton text={`In other words, pretend that ${premiseCountStr} are 100% true/full, on their main rating type.`}/>
						<br/>To what level would you expect them (assuming they're reasonable) to shift their {grandParentRatingType} rating?
					</span>
				);
			},
			options: (node, parent)=> {
				//if (parentNode == null) return Range(0, 100); // must support case where node is given standalone
				return (parent["finalType"] || parent.type) == MapNodeType.SupportingArgument ? Range(50, 100) : Range(0, 50);
			},
			ticks: (node, parent)=> {
				//if (parentNode == null) return Range(0, 100);
				return (parent["finalType"] || parent.type) == MapNodeType.SupportingArgument ? Range(50, 100, 5) : Range(0, 50, 5);
			},
		}),
		strength: new RatingType_Info({
			displayText: "Strength",
			description: ()=>"Argument strength is calculated based on the probabilities of its premises, and the probability/adjustment of its meta-thesis.",
			options: ()=>Range(0, 100),
			ticks: ()=>Range(0, 100, 5),
		}),
	} as {[key: string]: RatingType_Info};

	private constructor(info: Partial<RatingType_Info>) {
		this.Extend(info);
	}

	displayText: string;
	description: ((node: MapNode, parent: MapNode | MapNodeEnhanced, path: string)=>string | JSX.Element);
	options: ((node: MapNode, parent: MapNode | MapNodeEnhanced)=>number[]);
	ticks: ((node: MapNode, parent: MapNode | MapNodeEnhanced)=>number[]); // for x-axis labels
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