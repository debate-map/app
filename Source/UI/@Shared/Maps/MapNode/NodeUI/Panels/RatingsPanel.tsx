import {DN, Range, Vector2i} from "js-vextensions";
import {Pre, Select, Spinner} from "react-vcomponents";
import {BaseComponent, RenderSource, BaseComponentPlus} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis} from "recharts";
import {store} from "Source/Store";
import {GetRatingUISmoothing} from "Source/Store/main/ratingUI";
import {SlicePath} from "mobx-firelink";
import {Observer} from "vwebapp-framework";
import {MapNodeL3} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/@MapNode";
import {RatingType, GetRatingTypeInfo} from "Subrepos/Server/Source/@Shared/Store/firebase/nodeRatings/@RatingType";
import {Rating} from "Subrepos/Server/Source/@Shared/Store/firebase/nodeRatings/@RatingsRoot";
import {MeID} from "Subrepos/Server/Source/@Shared/Store/firebase/users";
import {GetNodeForm, GetNodeL3} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/$node";
import {GetNodeChildren} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes";
import {ShouldRatingTypeBeReversed, TransformRatingForContext} from "Subrepos/Server/Source/@Shared/Store/firebase/nodeRatings";
import {GetMapNodeTypeDisplayName} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/@MapNodeType";
import {SetNodeRating} from "Subrepos/Server/Source/@Shared/Commands/SetNodeRating";
import {ShowSignInPopup} from "../../../../NavBar/UserPanel";

/* let sampleData = [
	{rating: 0, count: 0},
	{rating: 25, count: 1},
	{rating: 50, count: 2},
	{rating: 75, count: 3},
	{rating: 100, count: 4},
]; */

type RatingsPanel_Props = {node: MapNodeL3, path: string, ratingType: RatingType, ratings: Rating[]};

@Observer
export class RatingsPanel extends BaseComponentPlus({} as RatingsPanel_Props, {size: null as Vector2i}) {
	render() {
		const {node, path, ratingType, ratings} = this.props;
		const {size} = this.state;

		const userID = MeID();
		const form = GetNodeForm(node, path);
		const nodeChildren = GetNodeChildren(node._key);
		let smoothing = GetRatingUISmoothing();

		const parentNode = GetNodeL3(SlicePath(path, 1));

		const reverseRatings = ShouldRatingTypeBeReversed(node, ratingType);
		const nodeTypeDisplayName = GetMapNodeTypeDisplayName(node.type, node, form, node.displayPolarity);

		const ratingTypeInfo = GetRatingTypeInfo(ratingType, node, parentNode, path);
		const {labels, values} = ratingTypeInfo;
		function GetValueForLabel(label) { return values[labels.indexOf(label)]; }
		function GetLabelForValue(value) { return labels[values.indexOf(value)]; }
		const myRating = TransformRatingForContext((ratings.find(a=>a._key == userID) || {} as any).value, reverseRatings);

		const smoothingOptions = [1, 2, 4, 5, 10, 20, 25, 50, 100]; // .concat(labels.Max(null, true) == 200 ? [200] : []);
		const minLabel = labels.Min(null, true); const maxLabel = labels.Max(null, true); const
			range = maxLabel - minLabel;
		smoothing = smoothing.KeepAtMost(labels.Max(null, true)); // smoothing might have been set higher, from when on another rating-type
		const ticksForChart = labels.Select(a=>a.RoundTo(smoothing)).Distinct();
		const dataFinal = ticksForChart.Select(tick=>{
			const rating = tick;
			return {label: tick, value: GetValueForLabel(tick), count: 0};
		});
		for (const entry of ratings) {
			const ratingVal = TransformRatingForContext(entry.value, reverseRatings);
			const closestRatingSlot = dataFinal.OrderBy(a=>a.value.Distance(ratingVal)).First();
			closestRatingSlot.count++;
		}

		/* if (ratingType == "strength") {
			let nodeChildren = GetNodeChildren(node);
			let argumentStrength = CalculateArgumentStrength(nodeChildren);
			let closestRatingSlot = dataFinal.OrderBy(a=>a.rating.Distance(argumentStrength)).First();
			closestRatingSlot.count++;
		} */

		/* let marginTop = myRating != null ? 20 : 10;
		let height = myRating != null ? 260 : 250; */


		return (
			<div ref="root" style={{position: "relative"/* , minWidth: 496 */}}
				onClick={e=>{
					if (ratingType == "impact") return;
					const target = $(e.target);
					// let chart = (target as any).plusParents().filter(".recharts-cartesian-grid");
					const chartHolder = (target as any).plusParents().filter("div.recharts-wrapper");
					if (chartHolder.length == 0) return;

					if (userID == null) return ShowSignInPopup();

					const chart = chartHolder.find(".recharts-cartesian-grid");
					const posOnChart = new Vector2i(e.pageX - chart.offset().left, e.pageY - chart.offset().top);
					const percentOnChart = posOnChart.x / chart.width();
					const ratingOnChart_exact = minLabel + (percentOnChart * range);
					const closestRatingSlot = dataFinal.OrderBy(a=>a.label.Distance(ratingOnChart_exact)).First();
					let newRating_label = closestRatingSlot.label;

					// let finalRating = GetRatingForForm(rating, form);
					const boxController = ShowMessageBox({
						title: `Rate ${ratingType} of ${nodeTypeDisplayName}`, cancelButton: true,
						message: ()=>(
							<div style={{padding: "10px 0"}}>
									Rating: <Spinner min={minLabel} max={maxLabel} style={{width: 60}}
									value={newRating_label} onChange={val=>DN(newRating_label = val, boxController.UpdateUI())}/>
							</div>
						),
						onOK: ()=>{
							// todo: have submitted date be based on local<>Firebase time-offset (retrieved from Firebase) [this prevents fail from security rules]
							let newRating_value = GetValueForLabel(newRating_label);
							newRating_value = TransformRatingForContext(newRating_value, reverseRatings);
							new SetNodeRating({nodeID: node._key, ratingType, value: newRating_value}).Run();
						},
					});
				}}
				onContextMenu={e=>{
					if (myRating == null || ratingType === "impact") return;
					const boxController = ShowMessageBox({
						title: "Delete rating", cancelButton: true,
						message: `Delete your "${ratingType}" rating for ${nodeTypeDisplayName}`,
						onOK: ()=>{
							new SetNodeRating({nodeID: node._key, ratingType, value: null}).Run();
						},
					});
				}}>
				<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
					{typeof ratingTypeInfo.description === "function"
						? ratingTypeInfo.description(node, parentNode, path)
						: ratingTypeInfo.description}
				</div>
				<div style={{display: "flex", alignItems: "center", justifyContent: "flex-end"}}>
					<Pre style={{marginRight: "auto", fontSize: 12, color: "rgba(255,255,255,.5)"}}>
						{ratingType == "impact"
							? 'Cannot rate impact directly. Instead, rate the "truth" and "relevance".'
							: "Click to rate. Right-click to remove rating."}
					</Pre>
					{/* Smoothing: <Spinner value={smoothing} onChange={val=>store.dispatch(new ACTRatingUISmoothnessSet(val))}/> */}
					<Pre>Smoothing: </Pre><Select options={smoothingOptions} value={smoothing} onChange={val=>store.main.ratingUI.smoothing = val}/>
				</div>
				{this.lastRender_source == RenderSource.SetState &&
					<AreaChart ref="chart" width={size.x} height={250} data={dataFinal}
						margin={{top: 20, right: 10, bottom: 0, left: 10}} /* viewBox={{x: 0, y: 250 - height, width: size.x, height: 250}} */>
						<XAxis dataKey="label" type="number" /* label={<XAxisLabel ratingType={ratingType}/>} */ ticks={Range(minLabel, maxLabel, ratingTypeInfo.tickInterval)}
							tick={ratingTypeInfo.tickRender}
							domain={[minLabel, maxLabel]} minTickGap={0}/>
						{/* <YAxis tickCount={7} hasTick width={50}/> */}
						<YAxis orientation="left" x={20} width={20} height={250} tickCount={9}/>
						<CartesianGrid stroke="rgba(255,255,255,.3)"/>
						<Area type="monotone" dataKey="count" stroke="#ff7300" fill="#ff7300" fillOpacity={0.9} layout="vertical" animationDuration={500}/>
						{myRating != null && <ReferenceLine x={GetLabelForValue(myRating)} stroke="rgba(0,255,0,1)" fill="rgba(0,255,0,1)" label="You"/>}
						<Tooltip content={<CustomTooltip external={dataFinal}/>}/>
					</AreaChart>}
			</div>
		);
	}
	PostRender() {
		if (this.lastRender_source == RenderSource.SetState) return;

		const dom = this.refs.root;
		if (!dom) return;

		const size = new Vector2i(dom.clientWidth, dom.clientHeight);
		// if (!size.Equals(this.state.size))
		this.SetState({size}, null, false);
	}
}

/* const XAxisLabel = props=> {
	let {x, y, width, height, viewBox, stroke, ratingType} = props;
	return (
		<g transform={`translate(${(viewBox.width / 2) + 10},${y + 12})`}>
			<text x={0} y={0} dy={16} fill="#AAA" textAnchor="middle">
				{ratingType + " %"}
			</text>
		</g>
	);
} */

class CustomTooltip extends BaseComponent<{active?, payload?, external?, label?}, {}> {
	render() {
		const {active, payload, external, label} = this.props;
    	if (!active) return null;

		const style = {
			padding: 6,
			backgroundColor: "#fff",
			border: "1px solid #ccc",
			color: "black",
		};

		const currData = external.filter(entry=>entry.label === label)[0];
		return (
			<div className="area-chart-tooltip" style={style}>
				<p className="ignoreBaseCSS">Rating: <em className="ignoreBaseCSS">{currData.label}%</em></p>
				<p className="ignoreBaseCSS">Count: <em className="ignoreBaseCSS">{currData.count}</em></p>
			</div>
		);
	}
}

/* interface JQuery {
	plusParents(topDown?: boolean): JQuery;
}
$.fn.plusParents = function(topDown = false) { */
($.fn as any).plusParents = function(topDown = false) {
	const parentsAndSelf = this.parents().addBack().toArray(); // addBack concats lists, and orders it top-down
	if (!topDown) { parentsAndSelf.reverse(); }
	return $(parentsAndSelf);
};