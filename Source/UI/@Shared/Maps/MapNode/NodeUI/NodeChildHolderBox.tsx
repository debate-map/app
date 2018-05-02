import {Connect} from "Frame/Database/FirebaseConnect";
import {emptyArray, emptyArray_forLoading} from "Frame/Store/ReducerUtils";
import {GetMarkerPercent_AtPath, GetRatings} from "Store/firebase/nodeRatings";
import {RatingType} from "Store/firebase/nodeRatings/@RatingType";
import {GetParentNodeL3} from "Store/firebase/nodes";
import {IsSinglePremiseArgument} from "Store/firebase/nodes/$node";
import {MapNodeL3} from "Store/firebase/nodes/@MapNode";
import {MapNodeType} from "Store/firebase/nodes/@MapNodeType";
import {ACTMapNodeExpandedSet} from "Store/main/mapViews/$mapView/rootNodeViews";
import {MapNodeView} from "Store/main/mapViews/@MapViews";
import {Row} from "react-vcomponents";
import {BaseComponentWithConnector} from "react-vextensions";
import {Map} from "../../../../../Store/firebase/maps/@Map";
import {GetFillPercent_AtPath} from "../../../../../Store/firebase/nodeRatings";
import {IsMultiPremiseArgument, IsPremiseOfSinglePremiseArgument} from "../../../../../Store/firebase/nodes/$node";
import {GetNodeColor} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {ExpandableBox} from "../ExpandableBox";
import {Squiggle} from "../NodeConnectorBackground";
import {NodeUI_Menu} from "../NodeUI_Menu";
import {NodeChildCountMarker} from "./NodeChildCountMarker";
import {NodeChildHolder} from "./NodeChildHolder";
import RatingsPanel from "./Panels/RatingsPanel";

export enum HolderType {
	Truth = 10,
	Relevance = 20,
}

type Props = {
	map: Map, node: MapNodeL3, path: string, nodeView: MapNodeView, nodeChildren: MapNodeL3[], nodeChildrenToShow: MapNodeL3[],
	type: HolderType, widthOfNode: number, widthOverride?: number, onHeightOrDividePointChange?: (dividePoint: number)=>void,
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

	let backgroundFillPercent = GetFillPercent_AtPath(node, path, type);
	let markerPercent = GetMarkerPercent_AtPath(node, path, type);

	return {
		backgroundFillPercent,
		markerPercent,
	};
};
@Connect(connector)
export class NodeChildHolderBox extends BaseComponentWithConnector(connector, {innerBoxOffset: 0, lineHolderHeight: 0, hovered: false, hovered_button: false}) {
	static ValidateProps(props) {
		let {node, nodeChildren} = props;
		// ms only asserts in dev for now; causes error sometimes when cut+pasting otherwise (firebase doesn't send DB updates atomically?)
		if (devEnv) {
			Assert(nodeChildren.every(a=>a == null || a.parents[node._id]), "Supplied node is not a parent of all the supplied node-children!");
		}
	}
	lineHolder: HTMLDivElement;
	render() {
		let {map, node, path, nodeView, nodeChildren, nodeChildrenToShow, type, widthOfNode, widthOverride, backgroundFillPercent, markerPercent} = this.props;
		let {innerBoxOffset, lineHolderHeight, hovered, hovered_button} = this.state;

		let isMultiPremiseArgument = IsMultiPremiseArgument(node);
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
		let expanded = nodeView[expandKey];

		let separateChildren = node.type == MapNodeType.Claim || IsSinglePremiseArgument(node);
		let showArgumentsControlBar = /*(node.type == MapNodeType.Claim || combineWithChildClaim) &&*/ expanded && nodeChildrenToShow != emptyArray_forLoading;

		let {width, height} = this.GetMeasurementInfo();
		if (widthOverride) {
			width = widthOverride;
		}

		let hovered_main = hovered && !hovered_button;
		let ratingPanelShow = (nodeView && nodeView[`selected_${holderTypeStr}`]) || hovered_main; //|| local_selected;

		return (
			<Row className="clickThrough" style={E(
				{position: "relative", alignItems: "flex-start"},
				//!isMultiPremiseArgument && {alignSelf: "flex-end"},
				!isMultiPremiseArgument && {left: `calc(${widthOfNode}px - ${width}px)`},
				isMultiPremiseArgument && {marginTop: 10, marginBottom: 5},
				// if we don't know our inner-box-offset yet, render still (so we can measure ourself), but make self invisible
				expanded && nodeChildrenToShow.length && innerBoxOffset == 0 && {opacity: 0, pointerEvents: "none"},
			)}>
				<Row className="clickThrough" style={E(
					{/*position: "relative", /* removal fixes */ alignItems: "flex-start", /*marginLeft: `calc(100% - ${width}px)`,*/ width},
				)}>
					<div ref={c=>this.lineHolder = c} className="clickThroughChain" style={{position: "absolute", width: "100%", height: "100%"}}>
						{type == HolderType.Truth && 
							<Squiggle start={[0, lineHolderHeight + 2]} startControl_offset={[0, -lineOffset]}
								end={[(width / 2) - 2, innerBoxOffset + height - 2]} endControl_offset={[0, lineOffset]} color={lineColor}/>}
						{type == HolderType.Relevance && !isMultiPremiseArgument &&
							<Squiggle start={[0, -2]} startControl_offset={[0, lineOffset]}
								end={[(width / 2) - 2, innerBoxOffset + 2]} endControl_offset={[0, -lineOffset]} color={lineColor}/>}
						{type == HolderType.Relevance && isMultiPremiseArgument &&
							<div style={{position: "absolute", right: "100%", width: 10, top: innerBoxOffset + (height / 2) - 2, height: 3, backgroundColor: lineColor.css()}}/>}
					</div>
					<ExpandableBox {...{width, widthOverride, expanded}} innerWidth={width}
						ref={c=>this.expandableBox = c}
						style={{marginTop: innerBoxOffset}}
						padding="3px 5px 2px"
						text={<span style={{position: "relative", fontSize: 13}}>{text}</span>}
						{...{backgroundFillPercent, backgroundColor, markerPercent}}
						toggleExpanded={e=> {
							store.dispatch(new ACTMapNodeExpandedSet({
								mapID: map._id, path, recursive: nodeView[expandKey] && e.altKey,
								[expandKey]: !nodeView[expandKey],
							}));
							e.nativeEvent.ignore = true; // for some reason, "return false" isn't working
							//return false;
							if (nodeView[expandKey]) {
								this.dividePoint = 0;
								this.CheckForChanges();
							}
						}}
						afterChildren={[
							ratingPanelShow &&
								<div ref={c=>this.ratingPanelHolder = c} style={{
									position: "absolute", left: 0, top: "calc(100% + 1px)",
									width: width, minWidth: (widthOverride|0).KeepAtLeast(550), zIndex: hovered_main ? 6 : 5,
									padding: 5, background: backgroundColor.css(), borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
								}}>
									{(()=> {
										let ratings = GetRatings(node._id, holderTypeStr as RatingType);
										return <RatingsPanel node={node} path={path} ratingType={holderTypeStr as RatingType} ratings={ratings}/>;
									})()}
								</div>,
							<NodeUI_Menu {...{map, node, path}} holderType={type}/>
						].AutoKey()}
					/>
					{nodeChildrenToShow != emptyArray && !expanded && nodeChildrenToShow.length != 0 &&
						<NodeChildCountMarker childCount={nodeChildrenToShow.length}/>}
					{/*!nodeView.expanded && (addedDescendants > 0 || editedDescendants > 0) &&
						<NodeChangesMarker {...{addedDescendants, editedDescendants, textOutline, limitBarPos}}/>*/}
				</Row>
				{nodeView[expandKey] &&
					<NodeChildHolder {...{map, node, path, nodeView, nodeChildrenToShow, type, separateChildren, showArgumentsControlBar}}
						linkSpawnPoint={innerBoxOffset + (height / 2)}
						onHeightOrDividePointChange={dividePoint=> {
							Assert(!IsNaN(dividePoint));
							this.dividePoint = dividePoint;
							this.CheckForChanges();
						}}/>}
			</Row>
		);
	}

	expandableBox: ExpandableBox;
	ratingPanelHolder: HTMLDivElement;
	ratingPanel: RatingsPanel;

	ComponentDidMount() {
		$(this.expandableBox.DOM).hover(()=>$(".scrolling").length == 0 && this.SetState({hovered: true}), ()=>this.SetState({hovered: false}));
		$(this.expandableBox.expandButton.DOM).hover(()=>$(".scrolling").length == 0 && this.SetState({hovered_button: true}), ()=>this.SetState({hovered_button: false}));
	}

	PostRender() {
		this.CheckForChanges();
	}

	dividePoint: number;

	lastLineHolderHeight = 0;
	lastHeight = 0;
	lastDividePoint = 0;
	CheckForChanges() {
		let {onHeightOrDividePointChange} = this.props;
		
		let lineHolderHeight = $(this.lineHolder).outerHeight();
		if (lineHolderHeight != this.lastLineHolderHeight) {
			this.SetState({lineHolderHeight});
		}
		this.lastLineHolderHeight = lineHolderHeight;

		let height = $(GetDOM(this)).outerHeight();
		if (height != this.lastHeight || this.dividePoint != this.lastDividePoint) {
			/*if (height != this.lastHeight) {
				this.OnHeightChange();
			}*/
			//if (this.dividePoint != this.lastDividePoint) {
				let {height} = this.GetMeasurementInfo();
				let distFromInnerBoxTopToMainBoxCenter = height / 2;
				let innerBoxOffset = (this.dividePoint - distFromInnerBoxTopToMainBoxCenter).NaNTo(0).KeepAtLeast(0);
				this.SetState({innerBoxOffset});
			//}

			if (onHeightOrDividePointChange) onHeightOrDividePointChange(this.dividePoint);
		}
		this.lastHeight = height;
		this.lastDividePoint = this.dividePoint;
	}
	
	GetMeasurementInfo() {
		//return {width: 90, height: 26};
		return {width: 90, height: 22};
	}
}