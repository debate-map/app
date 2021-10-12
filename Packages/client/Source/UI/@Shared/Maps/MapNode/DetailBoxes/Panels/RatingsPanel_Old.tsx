import {Lerp, Range, Vector2} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, Pre, Row, RowLR, Select, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {store} from "Store";
import {GetRatingUISmoothing} from "Store/main/ratingUI.js";
import {NoID, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {ES, GetViewportRect, Observer, observer_simple, uplotDefaults} from "web-vcore";
import {MapNodeL3, NodeRating_MaybePseudo, NodeRatingType, GetRatingTypeInfo, NodeRating, MeID, GetNodeForm, GetNodeL3, ShouldRatingTypeBeReversed, TransformRatingForContext, GetMapNodeTypeDisplayName, SetNodeRating, DeleteNodeRating, GetUserHidden, GetAccessPolicy, GetRatings, MapNodeType, Polarity, GetUserFollows_List} from "dm_common";
import {MarkHandled} from "Utils/UI/General.js";
import React, {createRef, useMemo} from "react";
import {ShowSignInPopup} from "../../../../NavBar/UserPanel.js";
import {PolicyPicker} from "../../../../../Database/Policies/PolicyPicker.js";
import {UPlot} from "web-vcore/nm/react-uplot.js";
import uPlot from "web-vcore/nm/uplot.js";
import useResizeObserver from "use-resize-observer";
import {Annotation, AnnotationsPlugin} from "web-vcore/nm/uplot-vplugins.js";
import chroma from "web-vcore/nm/chroma-js.js";
import {GetNodeColor} from "Store/db_ext/nodes.js";

type RatingsPanel_Props = {
	node: MapNodeL3, path: string, ratingType: NodeRatingType,
	asNodeUIOverlay?: boolean, uplotData_override?: uPlot.AlignedData,
	ownRatingOpacity?: number, customAlphaMultiplier?: number,
};

@Observer
export class RatingsPanel_Old extends BaseComponentPlus({} as RatingsPanel_Props, {}) {
	root: HTMLDivElement|n;
	render() {
		const {node, path, ratingType, asNodeUIOverlay, uplotData_override, ownRatingOpacity, customAlphaMultiplier = 1} = this.props;
		const {ref: rootRef, width = -1, height = -1} = useResizeObserver();
		const ratings = GetRatings(node.id, ratingType);

		const userID = MeID();
		const myDefaultAccessPolicy = GetUserHidden(userID)?.lastAccessPolicy;
		const form = GetNodeForm(node, path);
		let smoothing = GetRatingUISmoothing();

		const parentNode = GetNodeL3(SlicePath(path, 1));

		const reverseRatings = ShouldRatingTypeBeReversed(node, ratingType);
		const nodeTypeDisplayName = GetMapNodeTypeDisplayName(node.type, node, form, node.displayPolarity);

		const ratingTypeInfo = GetRatingTypeInfo(ratingType, node, parentNode, path);
		//const {labels, values} = ratingTypeInfo;
		const myRating_displayVal = TransformRatingForContext(ratings.find(a=>a.creator == userID)?.value, reverseRatings);
		const myRating_raw = ratingType == "impact" ? null : ratings.find(a=>a.creator == userID) as NodeRating;

		const userFollows = GetUserFollows_List(userID);
		const markRatingUsers = userFollows.filter(a=>a.markRatings).map(a=>a.targetUser);
		const ratingsToMark = ratings.filter(a=>markRatingUsers.includes(a.creator));

		//let asNodeUIOverlay_alphaMultiplier = asNodeUIOverlay ? .5 : 1;
		let asNodeUIOverlay_alphaMultiplier = asNodeUIOverlay ? .8 : 1;
		const lineTypes: uPlot.Series[] = [
			{
				label: "Rating value",
			},
			{
				label: "Rating count",
				//stroke: chroma(0, 1, .5, "hsl").css(),
				stroke: chroma("#ff7300").alpha(1 * asNodeUIOverlay_alphaMultiplier * customAlphaMultiplier).css(),
				fill: chroma("#ff7300").alpha(.5 * asNodeUIOverlay_alphaMultiplier * customAlphaMultiplier).css(),
				//fill: "#ff7300FF",
				points: {show: false},
				paths: uPlot.paths.spline!(),
				//paths: uPlot.paths.spline2,
			},
		];
		
		const smoothingOptions = [1, 2, 4, 5, 10, 20, 25, 50, 100];
		//smoothing = smoothing.KeepAtMost(labels.Max(undefined, true)); // smoothing might have been set higher, from when on another rating-type
		const xValues_min = 0;
		const xValues_max = 100;

		let uplotData: uPlot.AlignedData;
		if (uplotData_override) {
			uplotData = uplotData_override;
		} else {
			const ticks = Range(0, 100, smoothing);
			var xValues = ticks.slice();
			const yValues_ratings = ticks.map(a=>0); // start out values as 0 (will increment values in next section)
			uplotData = [xValues, yValues_ratings] as uPlot.AlignedData;
			for (const entry of ratings) {
				const ratingVal = TransformRatingForContext(entry.value, reverseRatings);
				const closestXValueStep = xValues.OrderBy(a=>a.Distance(ratingVal)).First();
				const closestXValueStep_index = xValues.indexOf(closestXValueStep);
				yValues_ratings[closestXValueStep_index]++;
			}
		}

		const annotations = useMemo(()=>{
			return ([
				myRating_displayVal != null && {
					type: "line",
					x: {value: myRating_displayVal, finalize: drawPos=>(drawPos - 1).KeepAtLeast(0).KeepAtMost(width - 3)}, // max sure line is not cut-off by container bounds
					//color: "rgba(0,255,0,1)",
					//lineWidth: 1,
					color: chroma("rgb(0,255,0)").alpha(ownRatingOpacity ?? (.5 * asNodeUIOverlay_alphaMultiplier)).css(),
					lineWidth: 2,
					drawType: "source-over",
				},
			] as Annotation[]).filter(a=>a);
		}, [myRating_displayVal, width, ownRatingOpacity]);
		//const chartOptions = GetChartOptions(width, height, lineTypes);
		const chartOptions = GetChartOptions(width, asNodeUIOverlay ? height : 250, lineTypes, uplotData, annotations, !!asNodeUIOverlay);
		return (
			<div ref={c=>this.root = c}
				style={ES(
					{position: "relative"}, //minWidth: 496
					asNodeUIOverlay && {position: "absolute", left: 0, right: 0, top: 0, bottom: 0, pointerEvents: "none"},
				)}
				onClick={e=>{
					if (asNodeUIOverlay) return;
					if (ratingType == "impact") return;
					const target = e.target as HTMLElement;
					//const chartHolder = (target as any).plusParents().filter("div.uplotHolder");
					const underActualGridPart = target.GetSelfAndParents().filter(a=>a.matches(".u-over")).length > 0;
					if (!underActualGridPart) return;
					const chartHolder = target.GetSelfAndParents().filter(a=>a.matches("div.uplotHolder"))[0];
					if (chartHolder == null) return;

					if (userID == null) return void ShowSignInPopup();

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
					if (asNodeUIOverlay) return;
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
				{!asNodeUIOverlay &&
				<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
					{/*typeof ratingTypeInfo.description === "function"
						? ratingTypeInfo.description(node, parentNode, path)
				: ratingTypeInfo.description*/}
				</div>}
				{!asNodeUIOverlay &&
				<div style={{display: "flex", alignItems: "center", justifyContent: "flex-end"}}>
					<Pre style={{marginRight: "auto", fontSize: 12, color: "rgba(255,255,255,.5)"}}>
						{ratingType == "impact"
							? 'Cannot rate impact directly. Instead, rate the "truth" and "relevance".'
							: "Click to rate. Right-click to remove rating."}
					</Pre>
					{/* Smoothing: <Spinner value={smoothing} onChange={val=>store.dispatch(new ACTRatingUISmoothnessSet(val))}/> */}
					<Pre>Smoothing: </Pre><Select options={smoothingOptions} value={smoothing} onChange={val=>store.main.ratingUI.smoothing = val}/>
				</div>}
				
				<div ref={rootRef as any} className="uplotHolder" style={ES({
					position: "relative", width: "100%",
					//height: "calc(100% - 53px)", // we need to cut off some height, for the legend
					height: "100%",
				})}>
					{width != -1 &&
					<>
						<style>{`
						.u-legend { font-size: 12px; }
						.u-legend .hideLegend { display: none; }
						`}</style>
						<UPlot chartRef={this.chart} options={chartOptions} data={uplotData} ignoreDoubleClick={true}/>
						{ratingsToMark.map((rating, index)=>{
							const markOpts = userFollows.find(a=>a.targetUser == rating.creator)!;
							return (
								<div key={index} style={{
									position: "absolute",
									display: "flex", alignItems: "center", justifyContent: "center",
									left: (rating.value / 100).ToPercentStr(), bottom: 0,
									width: 0, //height: 0,
									fontSize: markOpts.markRatings_size,
									color: markOpts.markRatings_color,
								}}>
									{markOpts.markRatings_symbol}
								</div>
							);
						})}
					</>}
				</div>
			</div>
		);
	}
	chart = createRef<uPlot>();
}

function GetChartOptions(width: number, height: number, lineTypes: uPlot.Series[], uplotData: uPlot.AlignedData, annotations: Annotation[], asNodeUIOverlay: boolean) {
	const legendHeight = 33; // from dev-tools
	const chartOptions: uPlot.Options = {
		class: "ratingsChart",
		width,
		//height: height - legendHeight,
		height,
		plugins: [
			AnnotationsPlugin({
				annotations,
			}),
		],
		cursor: {
			drag: {x: false, setScale: false},
		},
		axes: [
			{
				label: "Rating value",
				show: !asNodeUIOverlay,
				...uplotDefaults.axis_props_horizontal,
				//time: false,
			},
			{
				label: "Rating count",
				show: !asNodeUIOverlay,
				...uplotDefaults.axis_props_vertical,
				size: 30,
				incrs: [1],
			},
		],
		scales: {
			x: {time: false},
			y: {
				/*auto: false,
				min: 0,
				max: (uplotData[1].Max() ?? 0).KeepAtLeast(10),*/
				//range: [0, (uplotData[1].Max() ?? 0).KeepAtLeast(10)],
				range: ()=>[0, (uplotData[1].Max() ?? 0).KeepAtLeast(1)],
			},
		},
		legend: {
			show: false,
		},
		series: lineTypes,
	};
	return chartOptions;
}