import {BaseComponentWithConnector, BaseComponent, GetInnerComp, RenderSource, FindDOM, ShallowEquals} from "react-vextensions";
import { Connect } from "Frame/Database/FirebaseConnect";
import {Column, Row, Button} from "react-vcomponents";
import { MapNodeL3 } from "Store/firebase/nodes/@MapNode";
import NodeConnectorBackground from "UI/@Shared/Maps/MapNode/NodeConnectorBackground";
import { NodeUI } from "UI/@Shared/Maps/MapNode/NodeUI";
import {Map} from "../../../../../Store/firebase/maps/@Map";
import { MapNodeView } from "Store/main/mapViews/@MapViews";
import { MapNodeType } from "Store/firebase/nodes/@MapNodeType";
import {Vector2i} from "js-vextensions";
import {Polarity, MapNode} from "../../../../../Store/firebase/nodes/@MapNode";
import chroma from "chroma-js";
import {ChildLimitBar, NodeChildHolder} from "./NodeChildHolder";
import { emptyArray_forLoading } from "Frame/Store/ReducerUtils";
import {GetNodeColor} from "../../../../../Store/firebase/nodes/@MapNodeType";
import { GetRatingTypeInfo, RatingType } from "Store/firebase/nodeRatings/@RatingType";
import { SlicePath } from "Frame/Database/DatabaseHelpers";
import { GetParentNodeL3 } from "Store/firebase/nodes";
import { GetRatings } from "Store/firebase/nodeRatings";
import {TransformRatingForContext, ShouldRatingTypeBeReversed, GetRatingAverage} from "../../../../../Store/firebase/nodeRatings";
import { IsSinglePremiseArgument } from "Store/firebase/nodes/$node";
import {IsMultiPremiseArgument} from "../../../../../Store/firebase/nodes/$node";
import {Squiggle} from "../NodeConnectorBackground";
import { ACTMapNodeExpandedSet } from "Store/main/mapViews/$mapView/rootNodeViews";
import { WeightingType } from "Store/main";

export enum HolderType {
	Truth,
	Relevance,
}

type Props = {
	map: Map, node: MapNodeL3, path: string, nodeView: MapNodeView, nodeChildren: MapNodeL3[], nodeChildrenToShow: MapNodeL3[],
	type: HolderType, widthOverride?: number, onHeightOrDividePointChange?: (dividePoint: number)=>void,
};
let connector = (state, {node, nodeChildren}: Props)=> {
	return {
		combineWithChildClaim: IsSinglePremiseArgument(node),
	};
};
@Connect(connector)
export class NodeChildHolderBox extends BaseComponentWithConnector(connector, {innerBoxOffset: 0, lineHolderHeight: 0}) {
	static ValidateProps(props) {
		let {node, nodeChildren} = props;
		Assert(nodeChildren.All(a=>a == null || a.parents[node._id]), "Supplied node is not a parent of all the supplied node-children!");
	}
	lineHolder: HTMLDivElement;
	render() {
		let {map, node, path, nodeView, nodeChildren, nodeChildrenToShow, type, widthOverride, combineWithChildClaim} = this.props;
		let {innerBoxOffset, lineHolderHeight} = this.state;

		let isMultiPremiseArgument = IsMultiPremiseArgument(node, nodeChildren);
		let text = type == HolderType.Truth ? "True?" : "Relevant?";
		if (isMultiPremiseArgument) {
			text = "When taken together, are these claims relevant?";
		}
		let backgroundColor = chroma(`rgb(40,60,80)`) as Color;

		//let lineColor = GetNodeColor(node, "raw");
		let lineColor = GetNodeColor({type: MapNodeType.Category} as any as MapNodeL3, "raw");
		let lineOffset = 50..KeepAtMost(innerBoxOffset);
		//let expandKey = type == HolderType.Truth ? "expanded_truth" : "expanded_relevance";
		let expandKey = `expanded_${HolderType[type].toLowerCase()}`;

		//let mainRating_fillPercent = 100;
		let parentNode = GetParentNodeL3(path);
		var ratingType = {[HolderType.Truth]: "truth", [HolderType.Relevance]: "relevance"}[type] as RatingType;
		let ratingTypeInfo = GetRatingTypeInfo(ratingType, node, parentNode, path);

		let ratings = GetRatings(node._id, ratingType);
		let mainRating_average = GetRatingAverage(node._id, ratingType, null, -1);
		if (mainRating_average != -1) {
			mainRating_average = TransformRatingForContext(mainRating_average, ShouldRatingTypeBeReversed(node, ratingType));
		}
		//let mainRating_fillPercent = average;

		// temp
		let weightingType = State(a=>a.main.weighting);
		if (weightingType == WeightingType.ReasonScore) {
			mainRating_average = 0;
		}

		let separateChildren = node.type == MapNodeType.Claim || combineWithChildClaim;
		let showArgumentsControlBar = (node.type == MapNodeType.Claim || combineWithChildClaim) && nodeView[expandKey] && nodeChildrenToShow != emptyArray_forLoading;

		let {width, height} = this.GetMeasurementInfo();
		if (widthOverride) {
			width = widthOverride;
		}

		return (
			<Row className="clickThrough" style={E(
				{position: "relative", alignItems: "flex-start", /*marginLeft: `calc(100% - ${width}px)`,*/ width},
				!isMultiPremiseArgument && {alignSelf: "flex-end"},
				isMultiPremiseArgument && {marginTop: 10, marginBottom: 5},
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
						<div style={{position: "absolute", right: "100%", width: 10, top: "50%", height: 3, backgroundColor: backgroundColor.css()}}/>}
				</div>
				<div style={E({
					display: "flex", position: "relative", borderRadius: 5, cursor: "default",
					boxShadow: "rgba(0,0,0,1) 0px 0px 2px", width: width, marginTop: innerBoxOffset,
				})}>
					<Row style={{alignItems: "stretch", width: width, borderRadius: 5, cursor: "pointer"}}>
						<div style={{position: "relative", width: "calc(100% - 17px)", padding: "3px 5px 2px"}}>
							<div style={{
								position: "absolute", left: 0, top: 0, bottom: 0,
								width: mainRating_average + "%", background: backgroundColor.css(), borderRadius: "5px 0 0 5px",
							}}/>
							<div style={{
								position: "absolute", right: 0, top: 0, bottom: 0,
								width: (100 - mainRating_average) + "%", background: `rgba(0,0,0,.7)`, borderRadius: mainRating_average <= 0 ? "5px 0 0 5px" : 0,
							}}/>
							{/*mainRating_mine != null &&
								<div style={{
									position: "absolute", left: mainRating_myFillPercent + "%", top: 0, bottom: 0,
									width: 2, background: "rgba(0,255,0,.5)",
								}}/>*/}
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
	dividePoint: number;

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