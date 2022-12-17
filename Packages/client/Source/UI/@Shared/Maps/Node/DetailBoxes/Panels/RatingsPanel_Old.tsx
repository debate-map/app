import {emptyArray, Lerp, Range, Vector2, VRect} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, Pre, Row, RowLR, Select, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, UseEffect, UseState} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {store} from "Store";
import {GetRatingUISmoothing} from "Store/main/ratingUI.js";
import {NoID, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {Chroma, Chroma_Safe, ES, GetPageRect, GetViewportRect, InfoButton, Observer, observer_simple, RunInAction_Set, uplotDefaults} from "web-vcore";
import {NodeL3, NodeRating_MaybePseudo, NodeRatingType, GetRatingTypeInfo, NodeRating, MeID, GetNodeForm, GetNodeL3, ShouldRatingTypeBeReversed, TransformRatingForContext, GetNodeTypeDisplayName, SetNodeRating, DeleteNodeRating, GetUserHidden, GetAccessPolicy, GetRatings, NodeType, Polarity, GetUserFollows_List, GetRatingSummary} from "dm_common";
import {MarkHandled} from "Utils/UI/General.js";
import React, {createRef, useMemo} from "react";
import {UPlot} from "web-vcore/nm/react-uplot.js";
import uPlot from "web-vcore/nm/uplot.js";
import useResizeObserver from "use-resize-observer";
import {Annotation, AnnotationsPlugin} from "web-vcore/nm/uplot-vplugins.js";
import chroma from "web-vcore/nm/chroma-js.js";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {observer} from "web-vcore/nm/mobx-react";
import {RunCommand_DeleteNodeRating} from "Utils/DB/Command.js";
import {PolicyPicker} from "../../../../../Database/Policies/PolicyPicker.js";
import {ShowSignInPopup} from "../../../../NavBar/UserPanel.js";

type RatingsPanel_Props = {
	node: NodeL3, path: string, ratingType: NodeRatingType,
	asNodeUIOverlay?: boolean, uplotData_override?: uPlot.AlignedData,
	ownRatingOpacity?: number, customAlphaMultiplier?: number,
};

@Observer
export class RatingsPanel_Old extends BaseComponentPlus({} as RatingsPanel_Props, {}) {
	root: HTMLDivElement|n;
	chart = createRef<uPlot>();
	render() {
		const {node, path, ratingType, asNodeUIOverlay, uplotData_override, ownRatingOpacity, customAlphaMultiplier = 1} = this.props;
		const {ref: rootRef, width = -1, height = -1} = useResizeObserver();

		const [rootRect, setRootRect] = UseState<VRect|n>(null);
		const [chartBodyRect, setChartBodyRect] = UseState<VRect|n>(null);
		UseEffect(()=>{
			// after each render, find the chart-body subrect, and store it in state (so rating-markers can adjust to it)
			const newRootRect = this.DOM_HTML ? GetPageRect(this.DOM_HTML) : null;
			const newChartBodyRect = this.chart.current?.under ? GetViewportRect(this.chart.current?.under) : null;
			if (newRootRect && newRootRect.width && newChartBodyRect && newChartBodyRect.width) {
				if (!newRootRect.Equals(rootRect)) setRootRect(newRootRect);
				if (!newChartBodyRect.Equals(chartBodyRect)) setChartBodyRect(newChartBodyRect);
			}
		});
		const rectsResolved = rootRect != null && chartBodyRect != null;

		const meID = MeID();
		//const ratings = GetRatings(node.id, ratingType);
		//const ratingSummary = GetRatingSummary(node.id, ratingType); // used by parent ui
		const userFollows = GetUserFollows_List(meID);
		const markRatingUsers = userFollows.filter(a=>a.markRatings).map(a=>a.targetUser);
		//const ratingsOfSelfAndFollowed = GetRatings.CatchBail(emptyArray, node.id, ratingType, [...meID ? [meID] : [], ...markRatingUsers]); // catch bail (ie. allow lazy-load)
		// temp; to mitigate overwhelming of subscription plugin, do not load/show the symbols for self+followed ratings (since this requires a subscription per node)
		const ratingsOfSelfAndFollowed = [] as NodeRating[];

		const myDefaultAccessPolicy = GetUserHidden(meID)?.lastAccessPolicy;
		const form = GetNodeForm(node, path);
		const smoothing = GetRatingUISmoothing();

		const parentNode = GetNodeL3(SlicePath(path, 1));

		const reverseRatings = ShouldRatingTypeBeReversed(node, ratingType);
		const nodeTypeDisplayName = GetNodeTypeDisplayName(node.type, node, form, node.displayPolarity);

		const ratingTypeInfo = GetRatingTypeInfo(ratingType, node, parentNode, path);
		//const {labels, values} = ratingTypeInfo;
		const myRating_displayVal = TransformRatingForContext(ratingsOfSelfAndFollowed.find(a=>a.creator == meID)?.value, reverseRatings);
		const myRating_raw = ratingType == "impact" ? null : ratingsOfSelfAndFollowed.find(a=>a.creator == meID) as NodeRating;

		const ratingsToMark = ratingsOfSelfAndFollowed.filter(a=>markRatingUsers.includes(a.creator));

		//let asNodeUIOverlay_alphaMultiplier = asNodeUIOverlay ? .5 : 1;
		const asNodeUIOverlay_alphaMultiplier = asNodeUIOverlay ? .8 : 1;
		const lineTypes: uPlot.Series[] = [
			{
				label: "Rating value",
			},
			{
				label: "Rating count",
				//stroke: chroma(0, 1, .5, "hsl").css(),
				stroke: Chroma("#ff7300").alpha(1 * asNodeUIOverlay_alphaMultiplier * customAlphaMultiplier).css(),
				fill: Chroma("#ff7300").alpha(.5 * asNodeUIOverlay_alphaMultiplier * customAlphaMultiplier).css(),
				//fill: "#ff7300FF",
				points: {show: false},
				//paths: uPlot.paths.spline2,
				paths: uPlot.paths.spline!(),
				//paths: uPlot.paths.bars!({size: [1, 100], gap: 1}),
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
			// if uplotData_override is not set, it means we're showing the full, "detailed" version of this panel, which can have custom smoothing; thus we need the full rating-set
			const ratings = GetRatings(node.id, ratingType);

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
					x: {
						value: myRating_displayVal,
						// max sure line is not cut-off by container bounds (we scale by device-pixel-ratio, because the canvas' width uses that scaling)
						finalize: drawPos=>(drawPos - 1).KeepAtLeast(0).KeepAtMost((width - 3) * devicePixelRatio),
					},
					//color: "rgba(0,255,0,1)",
					//lineWidth: 1,
					color: Chroma("rgb(0,255,0)").alpha(ownRatingOpacity ?? (.5 * asNodeUIOverlay_alphaMultiplier)).css(),
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

					if (meID == null) return void ShowSignInPopup();

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
						message: observer(()=>{
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
						onOK: async()=>{
							//new DeleteNodeRating({id: myRating_raw.id}).RunOnServer();
							await RunCommand_DeleteNodeRating({id: myRating_raw.id});
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
					<Pre style={{fontSize: 12, color: "rgba(255,255,255,.5)"}}>
						{ratingType == "impact"
							? `Cannot rate impact directly. Instead, rate the "truth/agreement" and "relevance".`
							: "Click to rate. Right-click to remove rating."}
					</Pre>
					{ratingType == "impact" &&
					<InfoButton ml={5} text={`
						Note also that the "average impact" score (shown in panel-button to the left) will sometimes not seem to match the ratings shown in the chart.
						This is because the chart ignores ratings that are missing one of the truth/relevance scores (eg. rating the argument's relevance, but not all the premises), whereas the "average" includes them.
					`.AsMultiline(0)}/>}
					<Row ml="auto">
						{/* Smoothing: <Spinner value={smoothing} onChange={val=>store.dispatch(new ACTRatingUISmoothnessSet(val))}/> */}
						<Pre>Smoothing: </Pre><Select options={smoothingOptions} value={smoothing} onChange={val=>RunInAction_Set(this, ()=>store.main.ratingUI.smoothing = val)}/>
					</Row>
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
						{(asNodeUIOverlay || rectsResolved) &&
						//rootRect != null && chartBodyRect != null && 
						ratingsToMark.map((rating, index)=>{
							const markOpts = userFollows.find(a=>a.targetUser == rating.creator)!;
							const chartBodySizeRelToRoot = rectsResolved ? chartBodyRect!.width / rootRect!.width : null;
							return (
								<div key={index} style={ES(
									{
										position: "absolute",
										display: "flex", alignItems: "center", justifyContent: "center",
										width: 0, //height: 0,
										fontSize: markOpts.markRatings_size,
										color: markOpts.markRatings_color,
										pointerEvents: "none",
									},
									// when as node-ui overlay, we know the root-rect is the same as the chart-body-rect, so make more reliable by using a plain %-based positioning (defensive, and helped at least once)
									asNodeUIOverlay && {left: (rating.value / 100).ToPercentStr(), bottom: 0},
									!asNodeUIOverlay && {left: `calc(${chartBodyRect!.x - rootRect!.x}px + ${((rating.value / 100) * chartBodySizeRelToRoot!).ToPercentStr()}`, bottom: rootRect!.Bottom - chartBodyRect!.Bottom},
								)}>
									{markOpts.markRatings_symbol}
								</div>
							);
						})}
					</>}
				</div>
			</div>
		);
	}
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
			x: {
				time: false,
				range: ()=>[0, 100],
			},
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