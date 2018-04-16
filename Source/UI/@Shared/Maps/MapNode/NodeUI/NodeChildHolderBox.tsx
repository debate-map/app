import {BaseComponentWithConnector, BaseComponent, GetInnerComp, RenderSource, FindDOM, ShallowEquals} from "react-vextensions";
import { Connect } from "Frame/Database/FirebaseConnect";
import {Column, Row, Button} from "react-vcomponents";
import { MapNodeL3 } from "Store/firebase/nodes/@MapNode";
import NodeConnectorBackground from "UI/@Shared/Maps/MapNode/NodeConnectorBackground";
import { NodeUI } from "UI/@Shared/Maps/MapNode/NodeUI";
import {Map} from "../../../../../Store/firebase/maps/@Map";
import { MapNodeView } from "Store/main/mapViews/@MapViews";
import { MapNodeType } from "Store/firebase/nodes/@MapNodeType";
import {Vector2i, GetPercentFromXToY, Lerp} from "js-vextensions";
import {Polarity, MapNode} from "../../../../../Store/firebase/nodes/@MapNode";
import chroma from "chroma-js";
import {ChildLimitBar, NodeChildHolder} from "./NodeChildHolder";
import { emptyArray_forLoading } from "Frame/Store/ReducerUtils";
import {GetNodeColor} from "../../../../../Store/firebase/nodes/@MapNodeType";
import { GetRatingTypeInfo, RatingType } from "Store/firebase/nodeRatings/@RatingType";
import { SlicePath } from "Frame/Database/DatabaseHelpers";
import { GetParentNodeL3, GetNodeChildrenL3 } from "Store/firebase/nodes";
import { GetRatings, GetMarkerPercent_AtPath } from "Store/firebase/nodeRatings";
import {TransformRatingForContext, ShouldRatingTypeBeReversed, GetRatingAverage, RatingFilter, GetRatingAverage_AtPath, GetFillPercent_AtPath} from "../../../../../Store/firebase/nodeRatings";
import { IsSinglePremiseArgument } from "Store/firebase/nodes/$node";
import {IsMultiPremiseArgument, IsPremiseOfSinglePremiseArgument} from "../../../../../Store/firebase/nodes/$node";
import {Squiggle} from "../NodeConnectorBackground";
import { ACTMapNodeExpandedSet } from "Store/main/mapViews/$mapView/rootNodeViews";
import { WeightingType } from "Store/main";
import { RS_CalculateTruthScore, RS_CalculateBaseWeight, RS_CalculateWeightMultiplier, RS_CalculateWeight, RS_GetAllValues, ReasonScoreValues_RSPrefix } from "Store/firebase/nodeRatings/ReasonScore";
import { GetUserID } from "Store/firebase/users";
import RatingsPanel from "./Panels/RatingsPanel";

export enum HolderType {
	Truth,
	Relevance,
}

type Props = {
	map: Map, node: MapNodeL3, path: string, nodeView: MapNodeView, nodeChildren: MapNodeL3[], nodeChildrenToShow: MapNodeL3[],
	type: HolderType, widthOverride?: number, onHeightOrDividePointChange?: (dividePoint: number)=>void,
};
let connector = (state, {node, path, type, nodeChildren}: Props)=> {
	//let mainRating_fillPercent = 100;
	let parent = GetParentNodeL3(path);
	let combineWithParentArgument = IsPremiseOfSinglePremiseArgument(node, parent);
	//let ratingReversed = ShouldRatingTypeBeReversed(node);

	/*var ratingType = {[HolderType.Truth]: "truth", [HolderType.Relevance]: "relevance"}[type] as RatingType;
	let ratingTypeInfo = GetRatingTypeInfo(ratingType, node, parent, path);

	let ratings = GetRatings(node._id, ratingType);
	let mainRating_average = GetRatingAverage(node._id, ratingType, null, -1);
	if (mainRating_average != -1) {
		mainRating_average = TransformRatingForContext(mainRating_average, ShouldRatingTypeBeReversed(node, ratingType));
	}
	let mainRating_mine = GetRatingAverage_AtPath(node, ratingType, new RatingFilter({includeUser: GetUserID()}));
	//let mainRating_fillPercent = average;

	let weightingType = State(a=>a.main.weighting);
	let showReasonScoreValuesForThisNode = State(a=>a.main.weighting) == WeightingType.ReasonScore; //&& (node.type == MapNodeType.Argument || node.type == MapNodeType.Claim);
	if (showReasonScoreValuesForThisNode) {
		var reasonScoreValues = RS_GetAllValues(node, path, true) as ReasonScoreValues_RSPrefix;
	}*/

	let backgroundFillPercent = GetFillPercent_AtPath(node, path, true);
	let markerPercent = GetMarkerPercent_AtPath(node, path);

	return {
		combineWithChildClaim: IsSinglePremiseArgument(node),
		backgroundFillPercent,
		markerPercent,
	};
};
@Connect(connector)
export class NodeChildHolderBox extends BaseComponentWithConnector(connector, {innerBoxOffset: 0, lineHolderHeight: 0, hovered: false}) {
	static ValidateProps(props) {
		let {node, nodeChildren} = props;
		Assert(nodeChildren.All(a=>a == null || a.parents[node._id]), "Supplied node is not a parent of all the supplied node-children!");
	}
	lineHolder: HTMLDivElement;
	render() {
		let {map, node, path, nodeView, nodeChildren, nodeChildrenToShow, type, widthOverride, combineWithChildClaim, backgroundFillPercent, markerPercent} = this.props;
		let {innerBoxOffset, lineHolderHeight, hovered} = this.state;

		let isMultiPremiseArgument = IsMultiPremiseArgument(node, nodeChildren);
		let text = type == HolderType.Truth ? "True?" : "Relevant?";
		if (isMultiPremiseArgument) {
			text = "When taken together, are these claims relevant?";
		}
		//let backgroundColor = chroma(`rgb(40,60,80)`) as Color;
		let backgroundColor = GetNodeColor({type: MapNodeType.Claim} as any as MapNodeL3);
		//let lineColor = GetNodeColor(node, "raw");
		let lineColor = GetNodeColor({type: MapNodeType.Claim} as any as MapNodeL3, "raw");

		let lineOffset = 50..KeepAtMost(innerBoxOffset);
		//let expandKey = type == HolderType.Truth ? "expanded_truth" : "expanded_relevance";
		let holderTypeStr = HolderType[type].toLowerCase();
		let expandKey = `expanded_${holderTypeStr}`;

		let separateChildren = node.type == MapNodeType.Claim || combineWithChildClaim;
		let showArgumentsControlBar = (node.type == MapNodeType.Claim || combineWithChildClaim) && nodeView[expandKey] && nodeChildrenToShow != emptyArray_forLoading;

		let {width, height} = this.GetMeasurementInfo();
		if (widthOverride) {
			width = widthOverride;
		}

		let ratingPanelShow = (nodeView && nodeView[`selected_${holderTypeStr}`]) || hovered; //|| local_selected;

		return (
			<Row className="clickThrough" style={E(
				{position: "relative", alignItems: "flex-start", /*marginLeft: `calc(100% - ${width}px)`,*/ width},
				!isMultiPremiseArgument && {alignSelf: "flex-end"},
				isMultiPremiseArgument && {marginTop: 10, marginBottom: 5},
				// if we don't know our inner-box-offset yet, render still (so we can measure ourself), but make self invisible
				nodeView[expandKey] && nodeChildrenToShow.length && innerBoxOffset == 0 && {opacity: 0, pointerEvents: "none"},
			)}>
				<div ref={c=>this.lineHolder = c} className="clickThroughChain" style={{position: "absolute", width: "100%", height: "100%"}}>
					{type == HolderType.Truth && 
						//<div style={{position: "absolute", right: (width / 2) + 1, top: innerBoxOffset + (height / 2), bottom: 0, width: 3, backgroundColor: lineColor.css()}}/>
						//<div style={{position: "absolute", left: 0, width: "100%", top: innerBoxOffset + (height / 2), bottom: 0, backgroundColor: `rgba(0,0,0,.5)`}}/>
						/*<Squiggle start={[0, 100]} startControl_offset={[0, -30]} end={[50, 0]} endControl_offset={[0, 30]} color={lineColor}
							usePercents={true} style={{width, height: "100%"}}/>*/
						<Squiggle start={[0, lineHolderHeight + 2]} startControl_offset={[0, -lineOffset]}
							end={[(width / 2) - 2, innerBoxOffset + height - 2]} endControl_offset={[0, lineOffset]} color={lineColor}/>
					}
					{type == HolderType.Relevance && !isMultiPremiseArgument &&
						//<div style={{position: "absolute", right: (width / 2) + 1, top: 0, width: 3, height: innerBoxOffset + (height / 2), backgroundColor: lineColor.css()}}/>
						//<div style={{position: "absolute", left: 0, width: "100%", top: 0, height: innerBoxOffset + (height / 2), backgroundColor: `rgba(0,0,0,.5)`}}/>
						/*<Squiggle start={[0, 0]} startControl_offset={[0, 30]} end={[50, 100]} endControl_offset={[0, -30]} color={lineColor}
							usePercents={true} style={{width, height: "100%"}}/>*/
						<Squiggle start={[0, -2]} startControl_offset={[0, lineOffset]} end={[(width / 2) - 2, innerBoxOffset + 2]} endControl_offset={[0, -lineOffset]} color={lineColor}/>
					}
					{type == HolderType.Relevance && isMultiPremiseArgument &&
						<div style={{position: "absolute", right: "100%", width: 10, top: "50%", height: 3, backgroundColor: lineColor.css()}}/>}
				</div>
				<div ref={c=>this.innerUI = c} style={E({
					display: "flex", position: "relative", borderRadius: 5, cursor: "default",
					boxShadow: "rgba(0,0,0,1) 0px 0px 2px", width: width, marginTop: innerBoxOffset,
				}) as any}>
					<Row style={{alignItems: "stretch", width: width, borderRadius: 5, cursor: "pointer"}}>
						<div style={{position: "relative", width: "calc(100% - 17px)", padding: "3px 5px 2px"}}>
							<div style={{
								position: "absolute", left: 0, top: 0, bottom: 0,
								width: backgroundFillPercent + "%", background: backgroundColor.css(), borderRadius: "5px 0 0 5px",
							}}/>
							<div style={{
								position: "absolute", right: 0, top: 0, bottom: 0,
								width: (100 - backgroundFillPercent) + "%", background: `rgba(0,0,0,.7)`, borderRadius: backgroundFillPercent <= 0 ? "5px 0 0 5px" : 0,
							}}/>
							{markerPercent != null &&
								<div style={{
									position: "absolute", left: markerPercent + "%", top: 0, bottom: 0,
									width: 2, background: "rgba(0,255,0,.5)",
								}}/>}
							<span style={{position: "relative", fontSize: 13}}>{text}</span>
						</div>
						<Button text={nodeView[expandKey] ? "-" : "+"} //size={28}
								style={{
									display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
									width: 17, //minWidth: 18, // for some reason, we need min-width as well to fix width-sometimes-ignored issue
									padding: 0,
									fontSize: nodeView[expandKey] ? 23 : 17,
									lineHeight: "1px", // keeps text from making meta-theses too tall
									backgroundColor: backgroundColor.Mix("black", .2).alpha(.9).css(),
									border: "none",
									":hover": {backgroundColor: backgroundColor.Mix("black", .1).alpha(.9).css()},
								}}
								onClick={e=> {
									store.dispatch(new ACTMapNodeExpandedSet({
										mapID: map._id, path, recursive: nodeView[expandKey] && e.altKey,
										[expandKey]: !nodeView[expandKey],
									}));
									e.nativeEvent.ignore = true; // for some reason, "return false" isn't working
									//return false;
									if (nodeView[expandKey]) {
										this.dividePoint = 0;
										this.OnDividePointChange();
									}
								}}/>
					</Row>
					{ratingPanelShow &&
						<div style={{
							position: "absolute", left: 0, top: "calc(100% + 1px)",
							width: width, minWidth: (widthOverride|0).KeepAtLeast(550), zIndex: hovered ? 6 : 5,
							padding: 5, background: backgroundColor.css(), borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
						}}>
							{(()=> {
								let ratings = GetRatings(node._id, holderTypeStr as RatingType);
								return <RatingsPanel node={node} path={path} ratingType={holderTypeStr as RatingType} ratings={ratings}/>;
							})()}
						</div>}
				</div>
				{nodeView[expandKey] &&
					<NodeChildHolder {...{map, node, path, nodeView, nodeChildrenToShow, type, separateChildren, showArgumentsControlBar}}
						linkSpawnPoint={innerBoxOffset + (height / 2)}
						onHeightOrDividePointChange={dividePoint=> {
							this.dividePoint = dividePoint;
							this.OnDividePointChange();
						}}/>}
			</Row>
		);
	}
	innerUI: HTMLDivElement;
	dividePoint: number;

	ratingPanel: RatingsPanel;
	ComponentDidMount() {
		// we have to use native/jquery hover/mouseenter+mouseleave, to fix that in-equation term-placeholders would cause "mouseleave" to be triggered
		//let dom = $(FindDOM(this));
		//dom.off("mouseenter mouseleave");
		$(this.innerUI).hover(()=> {
			if ($(".scrolling").length == 0) {
				this.SetState({hovered: true});
			}
		}, ()=> {
			this.SetState({hovered: false})
		});
	}

	lastLineHolderHeight = 0;
	PostRender() {
		let lineHolderHeight = $(FindDOM(this.lineHolder)).outerHeight();
		if (lineHolderHeight != this.lastLineHolderHeight) {
			this.SetState({lineHolderHeight});
		}
		this.lastLineHolderHeight = lineHolderHeight;
	}
	
	GetMeasurementInfo() {
		//return {width: 90, height: 26};
		return {width: 90, height: 22};
	}

	OnDividePointChange() {
		/*this.childrenCenterY = childrenCenterY;
		this.UpdateLines();*/

		let {onHeightOrDividePointChange} = this.props;
		let {height} = this.GetMeasurementInfo();

		let distFromInnerBoxTopToMainBoxCenter = height / 2;
		let innerBoxOffset = (this.dividePoint - distFromInnerBoxTopToMainBoxCenter).KeepAtLeast(0);
		this.SetState({innerBoxOffset});

		if (onHeightOrDividePointChange) onHeightOrDividePointChange(this.dividePoint);
	}

	/*UpdateLines() {
		let {width, height} = this.GetMeasurementInfo();

		let distFromInnerBoxTopToMainBoxCenter = height / 2;
		let innerBoxOffset = (this.childrenCenterY - distFromInnerBoxTopToMainBoxCenter).KeepAtLeast(0);
		this.SetState({innerBoxOffset});
	}*/

	/*lastPos = 0;
	PostRender() {
		//if (this.lastRender_source == RenderSource.SetState) return;

		let height = $(FindDOM(this)).outerHeight();
		let pos = this.state.childrenCenterY|0;
		if (pos != this.lastPos) {
			this.OnPosChange();
		} else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateLines();
		}
		this.lastPos = pos;
	}
	OnPosChange() {
		let {node} = this.props;
		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
			()=>`OnPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}`);

		this.UpdateLines();
	}*/
}