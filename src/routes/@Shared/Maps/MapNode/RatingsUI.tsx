import * as jquery from "jquery";
import {Log} from "../../../../Frame/General/Logging";
import {BaseComponent, FindDOM, Pre, RenderSource, SimpleShouldUpdate, FindDOM_} from "../../../../Frame/UI/ReactGlobals";
import {Vector2i} from "../../../../Frame/General/VectorStructs";
import {Range, DN} from "../../../../Frame/General/Globals";
import Spinner from "../../../../Frame/ReactComponents/Spinner";
import {connect} from "react-redux";
import {RootState, GetRatingUISmoothing, GetUserID, Rating} from "../../../../store/reducers";
import {ACTRatingUISmoothnessSet} from "../../../../store/Store/Main";
import Select from "../../../../Frame/ReactComponents/Select";
import {ShowMessageBox_Base, ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {firebaseConnect} from "react-redux-firebase";
import {MapNode, MapNodeType_Info} from "../MapNode";
import {FirebaseConnect} from "./NodeUI";
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";

/*const data = [
	{rating: 1, count: 0},
	{rating: 25, count: 12},
	{rating: 30, count: 16},
	{rating: 40, count: 1},
	{rating: 45, count: 3},
	{rating: 50, count: 9},
	{rating: 70, count: 18},
	{rating: 75, count: 1},
	{rating: 90, count: 5},
	{rating: 92, count: 12},
	{rating: 94, count: 6},
	{rating: 96, count: 8},
	{rating: 98, count: 4},
	{rating: 99, count: 15},
];*/

export let ratingTypes = ["significance",  "probability", "adjustment"];
export type RatingType = "significance" | "probability" | "adjustment";
interface RatingTypeInfo {
	description: string;
	options: number[];
	ticks: number[]; // for x-axis labels
}

let ratingTypeInfos = {
	significance: {
		description: "TODO",
		options: Range(1, 100),
		ticks: Range(0, 100, 5),
	},
	probability: {
		description: "Probability that the statement, as presented, is true.",
		//options: [1, 2, 4, 6, 8].concat(Range(10, 90, 5)).concat([92, 94, 96, 98, 99]),
		//options: [1].concat(Range(2, 98, 2)).concat([99]),
		/*options: Range(1, 99),
		ticks: [1].concat(Range(5, 95, 5)).concat([99]),*/
		options: Range(0, 100),
		ticks: Range(0, 100, 5),
	},
	adjustment: {
		description: "What intensity the statement should be strengthened/weakened to, to reach its ideal state. (making substantial claims while maintaining accuracy)",
		/*options: [1, 2, 4, 6, 8].concat(Range(10, 200, 5)),
		ticks: [1].concat(Range(20, 200, 20)),*/
		options: Range(0, 200),
		ticks: Range(0, 200, 10),
	},
} as {[key: string]: RatingTypeInfo};
let ratingTypeDescriptions = {
	significance: "",
	probability: "Probability that the statement, as presented, is true.",
	adjustment: "What intensity the statement should be strengthened/weakened to, to reach its ideal state. (making substantial claims while maintaining accuracy)",
}

type RatingsUI_Props = {node: MapNode, ratingType: RatingType, ratings: Rating[]} & Partial<{userID: string, smoothing: number}>;
@firebaseConnect()
@(connect(()=> {
	return (state: RootState, props: RatingsUI_Props)=> ({
		userID: GetUserID(state),
		smoothing: GetRatingUISmoothing(state),
	}) as any;
}) as any)
export default class RatingsUI extends BaseComponent<RatingsUI_Props, {size: Vector2i}> {
	render() {
		let {node, ratingType, userID, ratings, smoothing, firebase} = this.props;
		let {size} = this.state;

		let ratingInfo = ratingTypeInfos[ratingType];

		let smoothingOptions = [1, 2, 4, 5, 10, 20, 25, 50, 100].concat(ratingInfo.options.Max() == 200 ? [200] : []);
		smoothing = smoothing.KeepBetween(ratingInfo.options.Min(), ratingInfo.options.Max()); // smoothing might have been set higher, from when on another rating-type
		let ticksForChart = ratingInfo.options.Select(a=>a.RoundTo(smoothing)).Distinct();
		let dataFinal = ticksForChart.Select(a=>({rating: a, count: 0}));
		for (let entry of ratings) {
			let closestRatingSlot = dataFinal.OrderBy(a=>a.rating.Distance(entry.value)).First();
			closestRatingSlot.count++;
		}

		return (
			<div ref="root" style={{position: "relative"/*, minWidth: 496*/}}
					onClick={e=> {
						let target = FindDOM_(e.target);
						//let chart = (target as any).plusParents().filter(".recharts-cartesian-grid");
						let chart = (target as any).plusParents().filter("div.recharts-wrapper");
						if (chart.length == 0) return;
						let posOnChart = new Vector2i(e.pageX - chart.offset().left, e.pageY - chart.offset().top);
						let percentOnChart = posOnChart.x / chart.width();
						let ratingOnChart_exact = percentOnChart * ticksForChart.Max();
						let closestRatingSlot = dataFinal.OrderBy(a=>a.rating.Distance(ratingOnChart_exact)).First();
						let rating = closestRatingSlot.rating;
						
						let finalRating = rating; // range: 0-1
						let boxController = ShowMessageBox({
							title: `Rate ${ratingType} of ${MapNodeType_Info.for[node.type].displayName}`, cancelButton: true,
							messageUI: ()=>(
								<div style={{padding: "10px 0"}}>
									Rating: <Spinner min={ratingInfo.options.Min()} max={ratingInfo.options.Max()} style={{width: 60}}
										value={finalRating} onChange={val=>DN(finalRating = val, boxController.UpdateUI())}/>
								</div>
							),
							onOK: ()=> {
								// todo: have submitted date be based on local<>Firebase time-offset (retrieved from Firebase) [this prevents fail from security rules]
								firebase.Ref(`nodeRatings/${node._key}/${ratingType}/${userID}`).set({updated: Date.now(), value: finalRating});
							}
						});
					}}>
				<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
					{ratingInfo.description}
				</div>
				<div style={{display: "flex", alignItems: "center", justifyContent: "flex-end"}}>
					{/*Smoothing: <Spinner value={smoothing} onChange={val=>store.dispatch(new ACTRatingUISmoothnessSet(val))}/>*/}
					Smoothing:<Pre> </Pre><Select options={smoothingOptions} value={smoothing} onChange={val=>store.dispatch(new ACTRatingUISmoothnessSet(val))}/>
				</div>
				{this.lastRender_source == RenderSource.SetState &&
					<AreaChart ref="chart" width={size.x} height={250} data={dataFinal}
							margin={{top: 10, right: 10, bottom: 10, left: 10}}>
						<XAxis dataKey="rating" ticks={ratingInfo.ticks} type="number" domain={[1, 99]} minTickGap={0}/>
						{/*<YAxis tickCount={7} hasTick width={50}/>*/}
						<YAxis orientation="left" x={20} width={20} height={250} viewBox={{x: 0, y: 0, width: 500, height: 500}} tickCount={9}/>
						<Tooltip content={<CustomTooltip external={dataFinal}/>}/>
						<CartesianGrid stroke="rgba(255,255,255,.3)"/>
						<Area type="monotone" dataKey="count" stroke="#ff7300" fill="#ff7300" fillOpacity={0.9} layout="vertical" animationDuration={500}/>
					</AreaChart>}
			</div>
		);
	}
	PostRender() {
		if (this.lastRender_source == RenderSource.SetState) return;

		let dom = this.refs.root;
		let size = new Vector2i(dom.clientWidth, dom.clientHeight);
		//if (!size.Equals(this.state.size))
		this.SetState({size});
	}
}

class CustomTooltip extends BaseComponent<{active?, payload?, external?, label?}, {}> {
	render() {
		const {active, payload, external, label} = this.props;
    	if (!active) return null;

		const style = {
			padding: 6,
			backgroundColor: '#fff',
			border: '1px solid #ccc',
			color: "black",
		};

		const currData = external.filter(entry=>entry.rating === label)[0];
		return (
			<div className="area-chart-tooltip" style={style}>
				<p className="ignoreBaseCSS">Rating: <em className="ignoreBaseCSS">{currData.rating}%</em></p>
				<p className="ignoreBaseCSS">Count: <em className="ignoreBaseCSS">{currData.count}</em></p>
			</div>
		);
	}
}

interface JQuery {
	plusParents(topDown?: boolean): JQuery;
}
$.fn.plusParents = function(topDown = false) {
	var parentsAndSelf = this.parents().addBack().toArray(); // addBack concats lists, and orders it top-down
	if (!topDown)
		parentsAndSelf.reverse();
	return $(parentsAndSelf);
};