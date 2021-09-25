import {DN, Lerp, Range, Vector2} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, Pre, Row, RowLR, Select, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, RenderSource, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {store} from "Store";
import {GetRatingUISmoothing} from "Store/main/ratingUI.js";
import {NoID, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {ES, GetViewportRect, Observer, observer_simple, uplotDefaults} from "web-vcore";
import {MapNodeL3, NodeRating_MaybePseudo, NodeRatingType, GetRatingTypeInfo, NodeRating, MeID, GetNodeForm, GetNodeL3, GetNodeChildren, ShouldRatingTypeBeReversed, TransformRatingForContext, GetMapNodeTypeDisplayName, SetNodeRating, DeleteNodeRating, GetUserHidden, GetAccessPolicy} from "dm_common";
import {MarkHandled} from "Utils/UI/General.js";
import React, {createRef} from "react";
import {ShowSignInPopup} from "../../../../NavBar/UserPanel.js";
import {PolicyPicker} from "../../../../../../UI/Database/Policies/PolicyPicker.js";
import {UPlot} from "web-vcore/nm/react-uplot.js";
import uPlot from "web-vcore/nm/uplot.js";
import useResizeObserver from "use-resize-observer";
import chroma from "chroma-js";

/*let sampleData = [
	{rating: 0, count: 0},
	{rating: 25, count: 1},
	{rating: 50, count: 2},
	{rating: 75, count: 3},
	{rating: 100, count: 4},
];*/

type RatingsPanel_Props = {node: MapNodeL3, path: string, ratingType: NodeRatingType, ratings: NodeRating_MaybePseudo[]};

@Observer
export class RatingsPanel extends BaseComponentPlus({} as RatingsPanel_Props, {}) {
	root: HTMLDivElement|n;
	render() {
		const {node, path, ratingType, ratings} = this.props;
		const {ref: rootRef, width = -1, height = -1} = useResizeObserver();

		const userID = MeID();
		const myDefaultAccessPolicy = GetUserHidden(userID)?.lastAccessPolicy;
		const form = GetNodeForm(node, path);
		const nodeChildren = GetNodeChildren(node.id);
		let smoothing = GetRatingUISmoothing();

		const parentNode = GetNodeL3(SlicePath(path, 1));

		const reverseRatings = ShouldRatingTypeBeReversed(node, ratingType);
		const nodeTypeDisplayName = GetMapNodeTypeDisplayName(node.type, node, form, node.displayPolarity);

		const ratingTypeInfo = GetRatingTypeInfo(ratingType, node, parentNode, path);
		const {labels, values} = ratingTypeInfo;
		/*function GetValueForLabel(label) { return values[labels.indexOf(label)]; }
		function GetLabelForValue(value) { return labels[values.indexOf(value)]; }*/
		const myRating_displayVal = TransformRatingForContext(ratings.find(a=>a.creator == userID)?.value, reverseRatings);
		const myRating_raw = ratingType == "impact" ? null : ratings.find(a=>a.creator == userID) as NodeRating;

		/*const smoothingOptions = [1, 2, 4, 5, 10, 20, 25, 50, 100]; // .concat(labels.Max(null, true) == 200 ? [200] : []);
		const minLabel = labels.Min(undefined, true); const maxLabel = labels.Max(undefined, true); const
			range = maxLabel - minLabel;
		smoothing = smoothing.KeepAtMost(labels.Max(undefined, true)); // smoothing might have been set higher, from when on another rating-type
		const ticksForChart = labels.map(a=>a.RoundTo(smoothing)).Distinct();
		const dataFinal = ticksForChart.map(tick=>{
			const rating = tick;
			return {label: tick, value: GetValueForLabel(tick), count: 0};
		});
		for (const entry of ratings) {
			const ratingVal = TransformRatingForContext(entry.value, reverseRatings);
			const closestRatingSlot = dataFinal.OrderBy(a=>a.value.Distance(ratingVal)).First();
			closestRatingSlot.count++;
		}*/

		/* if (ratingType == "strength") {
			let nodeChildren = GetNodeChildren(node);
			let argumentStrength = CalculateArgumentStrength(nodeChildren);
			let closestRatingSlot = dataFinal.OrderBy(a=>a.rating.Distance(argumentStrength)).First();
			closestRatingSlot.count++;
		} */

		/* let marginTop = myRating != null ? 20 : 10;
		let height = myRating != null ? 260 : 250; */

		const lineTypes: uPlot.Series[] = [
			{
				label: "Rating value",
			},
			{
				label: "Rating count",
				stroke: chroma(0, 1, .5, "hsl").css(),
				points: {show: false},
			},
		];
		
		const smoothingOptions = [1, 2, 4, 5, 10, 20, 25, 50, 100];
		//smoothing = smoothing.KeepAtMost(labels.Max(undefined, true)); // smoothing might have been set higher, from when on another rating-type
		const xValues_min = 0;
		const xValues_max = 100;

		const ticks = Range(0, 100, smoothing);
		const xValues = ticks.slice();
		const yValues_ratings = ticks.map(a=>0); // start out values as 0 (will increment values in next section)
		const uplotData = [xValues, yValues_ratings] as uPlot.AlignedData;

		for (const entry of ratings) {
			const ratingVal = TransformRatingForContext(entry.value, reverseRatings);
			const closestXValueStep = xValues.OrderBy(a=>a.Distance(ratingVal)).First();
			const closestXValueStep_index = xValues.indexOf(closestXValueStep);
			yValues_ratings[closestXValueStep_index]++;
		}

		//const chartOptions = GetChartOptions(width, height, lineTypes);
		const chartOptions = GetChartOptions(width, 250, lineTypes);
		return (
			<div ref={c=>this.root = c} style={{position: "relative"/* , minWidth: 496 */}}
				onClick={e=>{
					if (ratingType == "impact") return;
					const target = e.target as HTMLElement;
					//const chartHolder = (target as any).plusParents().filter("div.uplotHolder");
					const underActualGridPart = target.GetSelfAndParents().filter(a=>a.matches(".u-over")).length > 0;
					if (!underActualGridPart) return;
					const chartHolder = target.GetSelfAndParents().filter(a=>a.matches("div.uplotHolder"))[0];
					if (chartHolder == null) return;

					if (userID == null) return ShowSignInPopup();

					//const chart = chartHolder.querySelector(".recharts-cartesian-grid") as HTMLElement;
					const gridPart = chartHolder.querySelector(".u-over") as HTMLDivElement;
					const gridPartRect = GetViewportRect(gridPart);
					const posOnChart = new Vector2(e.clientX, e.clientY).Minus(gridPartRect);
					const percentOnChart = posOnChart.x / gridPartRect.width;
					const ratingOnChart_exact = Lerp(xValues_min, xValues_max, percentOnChart);
					const closestXValueStep = xValues.OrderBy(a=>a.Distance(ratingOnChart_exact)).First();
					let newRating_xValue = closestXValueStep;
					let newRating_accessPolicyID = myRating_raw?.accessPolicy ?? myDefaultAccessPolicy;

					// let finalRating = GetRatingForForm(rating, form);
					const splitAt = 100;
					const Change = (..._)=>boxController.UpdateUI();
					const boxController = ShowMessageBox({
						title: `Rate ${ratingType} of ${nodeTypeDisplayName}`, cancelButton: true,
						message: observer_simple(()=>{
							const newRating_accessPolicy = GetAccessPolicy.CatchBail(null, newRating_accessPolicyID);
							return (
								<Column p="10px 0">
									<RowLR splitAt={splitAt}>
										<Text>Rating:</Text>
										<Spinner min={xValues_min} max={xValues_max} style={{width: 60}}
											value={newRating_xValue} onChange={val=>Change(newRating_xValue = val)}/>
									</RowLR>
									<RowLR mt={5} splitAt={splitAt}>
										<Pre>Access policy: </Pre>
										<PolicyPicker value={newRating_accessPolicyID} onChange={val=>Change(newRating_accessPolicyID = val)}>
											<Button text={newRating_accessPolicy ? `${newRating_accessPolicy.name} (id: ${newRating_accessPolicy.id})` : "(click to select policy)"} style={{width: "100%"}}/>
										</PolicyPicker>
									</RowLR>
								</Column>
							);
						}),
						onOK: ()=>{
							let newRating_xValue_final = newRating_xValue;
							newRating_xValue_final = TransformRatingForContext(newRating_xValue_final, reverseRatings);
							const newRating = new NodeRating({
								accessPolicy: newRating_accessPolicyID,
								node: node.id,
								type: ratingType,
								value: newRating_xValue_final,
							});
							new SetNodeRating({rating: newRating}).RunOnServer();
						},
					});
				}}
				onContextMenu={e=>{
					if (myRating_raw == null || ratingType === "impact") return;
					MarkHandled(e);
					const boxController = ShowMessageBox({
						title: "Delete rating", cancelButton: true,
						message: `Delete your "${ratingType}" rating for ${nodeTypeDisplayName}`,
						onOK: ()=>{
							new DeleteNodeRating({id: myRating_raw.id}).RunOnServer();
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
				{/*this.lastRender_source == RenderSource.SetState && size != null &&
					<AreaChart width={size.x} height={250} data={dataFinal}
						margin={{top: 20, right: 10, bottom: 0, left: 10}} /* viewBox={{x: 0, y: 250 - height, width: size.x, height: 250}} *#/>
						<XAxis dataKey="label" type="number" /* label={<XAxisLabel ratingType={ratingType}/>} *#/ ticks={Range(minLabel, maxLabel, ratingTypeInfo.tickInterval)}
							tick={ratingTypeInfo.tickRender}
							domain={[minLabel, maxLabel]} minTickGap={0}/>
						{/* <YAxis tickCount={7} hasTick width={50}/> *#/}
						<YAxis orientation="left" x={20} width={20} height={250} tickCount={9}/>
						<CartesianGrid stroke="rgba(255,255,255,.3)"/>
						<Area type="monotone" dataKey="count" stroke="#ff7300" fill="#ff7300" fillOpacity={0.9} layout="vertical" animationDuration={500}/>
						{myRating_displayVal != null && <ReferenceLine x={GetLabelForValue(myRating_displayVal)} stroke="rgba(0,255,0,1)" fill="rgba(0,255,0,1)" label="You"/>}
						<Tooltip content={<CustomTooltip external={dataFinal}/>}/>
					</AreaChart>*/}
				
				<div ref={rootRef as any} className="uplotHolder" style={ES({
					position: "relative", width: "100%", height: "calc(100% - 53px)", // we need to cut off some height, for the legend
				})}>
					{width != -1 &&
					<>
						<style>{`
						.u-legend { font-size: 12px; }
						.u-legend .hideLegend { display: none; }
						`}</style>
						<UPlot chartRef={this.chart} options={chartOptions} data={uplotData} ignoreDoubleClick={true}/>
					</>}
				</div>
			</div>
		);
	}
	chart = createRef<uPlot>();
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

function GetChartOptions(width: number, height: number, lineTypes: uPlot.Series[]) {
	const legendHeight = 33; // from dev-tools
	const chartOptions: uPlot.Options = /*useMemo(()=>{
	return*/ {
		//id: `ratingsChart`,
		class: "ratingsChart",
		width,
		//height: height - legendHeight,
		height,
		cursor: {
			drag: {x: false, setScale: false},
		},
		axes: [
			{
				label: "Rating value",
				...uplotDefaults.axis_props_horizontal,
				//time: false,
			},
			{
				label: "Rating count",
				...uplotDefaults.axis_props_vertical,
				size: 30,
				incrs: [1],
			},
		],
		scales: {
			x: {
				time: false,
				/*range(u, dataMin, dataMax): [number, number] {
					return [-10 * EEGChart_live_graphedSamplesPerSecond, 0];
				},*/
			},
			y: {
				/*auto: false,
				//min: -100, max: 100,
				range: (u, dataMin, dataMax)=>{ // use func, since stable
					return [-100, 100] as [number, number];
				},*/
			},
		},
		legend: {
			show: false,
		},
		series: lineTypes,
	};
	//}, [width, height, lineTypes]);
	return chartOptions;
}