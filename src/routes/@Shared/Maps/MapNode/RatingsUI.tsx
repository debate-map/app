import * as jquery from "jquery";
import {Log} from "../../../../Frame/General/Logging";
import {BaseComponent, FindDOM, Pre, RenderSource, SimpleShouldUpdate, FindDOM_} from "../../../../Frame/UI/ReactGlobals";
import {Vector2i} from "../../../../Frame/General/VectorStructs";
import {Range, DN} from "../../../../Frame/General/Globals";
import Spinner from "../../../../Frame/ReactComponents/Spinner";
import {connect} from "react-redux";
import Select from "../../../../Frame/ReactComponents/Select";
import {ShowMessageBox_Base, ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {firebaseConnect} from "react-redux-firebase";
import {MapNode} from "../MapNode";
import {GetData} from "../../../../Frame/Database/DatabaseHelpers";
import {RatingType, RatingType_Info} from "./RatingType";
import {MapNodeType_Info} from "../MapNodeType";
import {ACTRatingUISmoothnessSet, GetRatingUISmoothing} from "../../../../store/Root/Main";
import {GetUserID, Rating} from "../../../../store/Root/Firebase";
import {RootState} from "../../../../store/Root";
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";

type RatingsUI_Props = {node: MapNode, path: string, ratingType: RatingType, ratings: Rating[]} & Partial<{userID: string, smoothing: number}>;
@firebaseConnect()
@(connect(()=> {
	return (state: RootState, props: RatingsUI_Props)=> ({
		userID: GetUserID(),
		smoothing: GetRatingUISmoothing(state),
	}) as any;
}) as any)
export default class RatingsUI extends BaseComponent<RatingsUI_Props, {size: Vector2i}> {
	render() {
		let {node, path, ratingType, userID, ratings, smoothing, firebase} = this.props;
		let {size} = this.state;

		let ratingTypeInfo = RatingType_Info.for[ratingType];

		let smoothingOptions = [1, 2, 4, 5, 10, 20, 25, 50, 100].concat(ratingTypeInfo.options.Max() == 200 ? [200] : []);
		smoothing = smoothing.KeepBetween(ratingTypeInfo.options.Min(), ratingTypeInfo.options.Max()); // smoothing might have been set higher, from when on another rating-type
		let ticksForChart = ratingTypeInfo.options.Select(a=>a.RoundTo(smoothing)).Distinct();
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
						let chartHolder = (target as any).plusParents().filter("div.recharts-wrapper");
						if (chartHolder.length == 0) return;

						let chart = chartHolder.find(".recharts-cartesian-grid");
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
									Rating: <Spinner min={ratingTypeInfo.options.Min()} max={ratingTypeInfo.options.Max()} style={{width: 60}}
										value={finalRating} onChange={val=>DN(finalRating = val, boxController.UpdateUI())}/>
								</div>
							),
							onOK: ()=> {
								// todo: have submitted date be based on local<>Firebase time-offset (retrieved from Firebase) [this prevents fail from security rules]
								firebase.Ref(`nodeRatings/${node._id}/${ratingType}/${userID}`).set({updated: Date.now(), value: finalRating});
							}
						});
					}}>
				<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
					{typeof ratingTypeInfo.description == "function" ? ratingTypeInfo.description(GetData(firebase, `nodes/${path.split("/").XFromLast(1)}`)) : ratingTypeInfo.description}
				</div>
				<div style={{display: "flex", alignItems: "center", justifyContent: "flex-end"}}>
					{/*Smoothing: <Spinner value={smoothing} onChange={val=>store.dispatch(new ACTRatingUISmoothnessSet(val))}/>*/}
					Smoothing:<Pre> </Pre><Select options={smoothingOptions} value={smoothing} onChange={val=>store.dispatch(new ACTRatingUISmoothnessSet(val))}/>
				</div>
				{this.lastRender_source == RenderSource.SetState &&
					<AreaChart ref="chart" width={size.x} height={250} data={dataFinal}
							margin={{top: 10, right: 10, bottom: 10, left: 10}}>
						<XAxis dataKey="rating" ticks={ratingTypeInfo.ticks} type="number" domain={[1, 99]} minTickGap={0}/>
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