import * as jquery from "jquery";
import {Log} from "../../../../../Frame/General/Logging";
import {BaseComponent, FindDOM, Pre, RenderSource, SimpleShouldUpdate, FindDOM_} from "../../../../../Frame/UI/ReactGlobals";
import {Vector2i} from "../../../../../Frame/General/VectorStructs";
import {Range, DN} from "../../../../../Frame/General/Globals";
import Spinner from "../../../../../Frame/ReactComponents/Spinner";
import {connect} from "react-redux";
import Select from "../../../../../Frame/ReactComponents/Select";
import {ShowMessageBox_Base, ShowMessageBox} from "../../../../../Frame/UI/VMessageBox";
import {firebaseConnect} from "react-redux-firebase";
import {GetData} from "../../../../../Frame/Database/DatabaseHelpers";
import {Debugger} from "../../../../../Frame/General/Globals_Free";
import {RatingType, RatingType_Info} from "../../../../../Store/firebase/nodeRatings/@RatingType";
import {Rating} from "../../../../../Store/firebase/nodeRatings/@RatingsRoot";
import {MapNode} from "../../../../../Store/firebase/nodes/@MapNode";
import {GetUserID} from "../../../../../Store/firebase/users";
import {RootState} from "../../../../../Store/index";
import {GetRatingUISmoothing, ACTRatingUISmoothnessSet} from "../../../../../Store/main/ratingUI";
import {GetNodeChildren, GetParentNode} from "../../../../../Store/firebase/nodes";
import {MapNodeType_Info} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {Connect} from "../../../../../Frame/Database/FirebaseConnect";
import {ShowSignInPopup} from "../../../Navbar/UserPanel";
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";

type RatingsPanel_Props = {node: MapNode, path: string, ratingType: RatingType, ratings: Rating[]} & Partial<{userID: string, nodeChildren: MapNode[]}>;
@Connect((state: RootState, {node, ratingType}: RatingsPanel_Props)=> {
	return {
		userID: GetUserID(),
		//myVote: GetData(`nodeRatings/${node._id}/${ratingType}/${GetUserID()}/value`),
		nodeChildren: GetNodeChildren(node),
	};
})
export default class RatingsPanel extends BaseComponent<RatingsPanel_Props, {size: Vector2i}> {
	render() {
		let {node, path, ratingType, ratings, userID, nodeChildren} = this.props;
		let firebase = store.firebase.helpers;
		let {size} = this.state;

		let parentNode = GetParentNode(path);
		let ratingTypeInfo = RatingType_Info.for[ratingType];
		let options = typeof ratingTypeInfo.options == "function" ? ratingTypeInfo.options(node, parentNode) : ratingTypeInfo.options;
		let myRatingValue = ratings.find(a=>a._key == userID);

		let smoothingOptions = [1, 2, 4, 5, 10, 20, 25, 50, 100].concat(options.Max() == 200 ? [200] : []);
		let minVal = options.Min(), maxVal = options.Max(), range = maxVal - minVal;
		let smoothing = GetRatingUISmoothing();
		smoothing = smoothing.KeepAtMost(options.Max()); // smoothing might have been set higher, from when on another rating-type
		let ticksForChart = options.Select(a=>a.RoundTo(smoothing)).Distinct();
		let dataFinal = ticksForChart.Select(a=>({rating: a, count: 0}));
		for (let entry of ratings) {
			let closestRatingSlot = dataFinal.OrderBy(a=>a.rating.Distance(entry.value)).First();
			closestRatingSlot.count++;
		}

		/*if (ratingType == "strength") {
			let nodeChildren = GetNodeChildren(node);
			let argumentStrength = CalculateArgumentStrength(nodeChildren);
			let closestRatingSlot = dataFinal.OrderBy(a=>a.rating.Distance(argumentStrength)).First();
			closestRatingSlot.count++;
		}*/

		return (
			<div ref="root" style={{position: "relative"/*, minWidth: 496*/}}
					onClick={e=> {
						if (ratingType == "strength") return;
						let target = FindDOM_(e.target);
						//let chart = (target as any).plusParents().filter(".recharts-cartesian-grid");
						let chartHolder = (target as any).plusParents().filter("div.recharts-wrapper");
						if (chartHolder.length == 0) return;

						if (userID == null) {
							return ShowSignInPopup();
						}

						let chart = chartHolder.find(".recharts-cartesian-grid");
						let posOnChart = new Vector2i(e.pageX - chart.offset().left, e.pageY - chart.offset().top);
						let percentOnChart = posOnChart.x / chart.width();
						let ratingOnChart_exact = minVal + (percentOnChart * range);
						let closestRatingSlot = dataFinal.OrderBy(a=>a.rating.Distance(ratingOnChart_exact)).First();
						let rating = closestRatingSlot.rating;
						
						let finalRating = rating; // range: 0-1
						let boxController = ShowMessageBox({
							title: `Rate ${ratingType} of ${MapNodeType_Info.for[node.type].displayName}`, cancelButton: true,
							messageUI: ()=>(
								<div style={{padding: "10px 0"}}>
									Rating: <Spinner min={options.Min()} max={options.Max()} style={{width: 60}}
										value={finalRating} onChange={val=>DN(finalRating = val, boxController.UpdateUI())}/>
								</div>
							),
							onOK: ()=> {
								// todo: have submitted date be based on local<>Firebase time-offset (retrieved from Firebase) [this prevents fail from security rules]
								firebase.Ref(`nodeRatings/${node._id}/${ratingType}/${userID}`).set({updated: Date.now(), value: finalRating});
							}
						});
					}}
					onContextMenu={e=> {
						if (myRatingValue == null) return;
						let boxController = ShowMessageBox({
							title: `Delete rating`, cancelButton: true,
							message: `Delete your "${ratingType}" rating for ${MapNodeType_Info.for[node.type].displayName}`,
							onOK: ()=> {
								firebase.Ref(`nodeRatings/${node._id}/${ratingType}/${userID}`).set(null);
							}
						});
					}}>
				<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
					{typeof ratingTypeInfo.description == "function"
						? ratingTypeInfo.description(node, GetData(`nodes/${path.split("/").XFromLast(1)}`))
						: ratingTypeInfo.description}
				</div>
				<div style={{display: "flex", alignItems: "center", justifyContent: "flex-end"}}>
					<Pre style={{marginRight: "auto", fontSize: 12, color: "rgba(255,255,255,.5)"}}>
						{ratingType == "strength"
							? "Cannot rate this directly. Instead, rate the premises and meta-thesis."
							: "Click to rate. Right-click to remove rating."}
					</Pre>
					{/*Smoothing: <Spinner value={smoothing} onChange={val=>store.dispatch(new ACTRatingUISmoothnessSet(val))}/>*/}
					<Pre>Smoothing: </Pre><Select options={smoothingOptions} value={smoothing} onChange={val=>store.dispatch(new ACTRatingUISmoothnessSet(val))}/>
				</div>
				{this.lastRender_source == RenderSource.SetState &&
					<AreaChart ref="chart" width={size.x} height={250} data={dataFinal}
							margin={{top: 10, right: 10, bottom: 10, left: 10}}>
						<XAxis dataKey="rating" ticks={ratingTypeInfo.ticks(node, parentNode)} type="number" domain={[options.Min(), options.Max()]} minTickGap={0}/>
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