import {ArgumentType, ChangeType, ChildGroup, GetParentNodeL3, IsMultiPremiseArgument, IsPremiseOfSinglePremiseArgument, Map, NodeL3, NodeType, NodeRatingType} from "dm_common";
import React, {useCallback} from "react";
import {GetNodeColor} from "Store/db_ext/nodes";
import {ACTNodeExpandedSet, GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {GADDemo} from "UI/@GAD/GAD.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {SLSkin} from "Utils/Styles/Skins/SLSkin.js";
import {FlashComp} from "ui-debug-kit";
import {Chroma, ES, HSLA, Observer, RunInAction} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
import {E, emptyArray, emptyArray_forLoading} from "web-vcore/nm/js-vextensions.js";
import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM, UseCallback, UseEffect, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {StripesCSS, useRef_nodeLeftColumn} from "tree-grapher";
import {GetTimeFromWhichToShowChangedNodes} from "Store/main/maps/mapStates/$mapState.js";
import {GetPathsToChangedDescendantNodes_WithChangeTypes} from "Store/db_ext/mapNodeEdits.js";
import {nodeBottomPanel_minWidth} from "../DetailBoxes/NodeUI_BottomPanel.js";
import {RatingsPanel} from "../DetailBoxes/Panels/RatingsPanel.js";
import {ExpandableBox} from "../ExpandableBox.js";
import {NodeUI_Menu_Stub} from "../NodeUI_Menu.js";
import {NodeChildCountMarker} from "./NodeChildCountMarker.js";
import {NodeChildHolder} from "./NodeChildHolder.js";
import {GUTTER_WIDTH_SMALL, GUTTER_WIDTH} from "../NodeUI.js";

type Props = {
	map: Map, node: NodeL3, path: string, treePath: string, inBelowGroup: boolean, nodeChildren: NodeL3[], nodeChildrenToShow: NodeL3[],
	group: ChildGroup, widthOfNode: number, heightOfNode: number, widthOverride?: number, onSizesChange?: (aboveHeight: number, belowHeight: number)=>void,
	ref_expandableBox?: (c: ExpandableBox|n)=>any,
};

@WarnOfTransientObjectProps
@Observer
export class NodeChildHolderBox extends BaseComponentPlus({} as Props, {lineHolderHeight: 0, hovered: false, hovered_button: false}) {
	static ValidateProps(props: Props) {
		const {node, nodeChildren} = props;
		// ms only asserts in dev for now (and only as warning); causes error sometimes when cut+pasting otherwise (firebase doesn`t send DB updates atomically?)
		/*if (DEV) {
			AssertWarn(nodeChildren.every(a=>a == null || (a.parents || {})[node.id] != null), "Supplied node is not a parent of all the supplied node-children!");
		}*/
	}
	//lineHolder: HTMLDivElement|n;
	render() {
		const {map, node, path, treePath, inBelowGroup, nodeChildren, nodeChildrenToShow, group, widthOfNode, heightOfNode, widthOverride, ref_expandableBox} = this.props;
		const {lineHolderHeight, hovered, hovered_button} = this.state;

		// const nodeView = GetNodeView(map.id, path) ?? new NodeView();
		// const nodeView = GetNodeView(map.id, path, true);
		const nodeView = GetNodeView(map.id, path);
		const parent = GetParentNodeL3(path);
		const combineWithParentArgument = IsPremiseOfSinglePremiseArgument(node, parent);

		//const backgroundFillPercent = GetFillPercent_AtPath(node, path, group);
		const backgroundFillPercent = 100;
		//const markerPercent = GetMarkerPercent_AtPath(node, path, group);
		const markerPercent = null;

		const isMultiPremiseArgument = IsMultiPremiseArgument(node);
		const text =
			group == ChildGroup.truth ? (GADDemo ? "Reasons" : "True?") :
			group == ChildGroup.relevance ? "Relevant?" :
			group == ChildGroup.neutrality ? "Neutral?" :
			group == ChildGroup.freeform ? "Freeform" :
			"n/a";
		/*if (group == ChildGroup.relevance && isMultiPremiseArgument) {
			//text = "When taken together, are these claims relevant?";
			if (node.argumentType == ArgumentType.all) text = "If all these claims were true, would they be relevant?";
			else if (node.argumentType == ArgumentType.any) text = "If 1 (or more) of these claims were true, would they be relevant?";
			else if (node.argumentType == ArgumentType.anyTwo) text = "If 2 (or more) of these claims were true, would they be relevant?";
		}*/
		// let backgroundColor = chroma(`rgb(40,60,80)`) as Color;
		const backgroundColor = GetNodeColor({type: group == ChildGroup.freeform ? NodeType.category : NodeType.claim} as any as NodeL3);
		// let lineColor = GetNodeColor(node, "raw");
		const lineColor = GetNodeColor({type: NodeType.claim} as any as NodeL3, "raw");

		//const lineOffset = 50.0.KeepAtMost(innerBoxOffset);
		// let expandKey = type == ChildGroup.truth ? "expanded_truth" : "expanded_relevance";
		const childGroupStr = ChildGroup[group].toLowerCase();
		const expandKey = `expanded_${childGroupStr}`;
		const expanded = nodeView[expandKey]; // this.Expanded

		//const separateChildren = (node.type == NodeType.claim || node.type == NodeType.argument) && group != ChildGroup.freeform;
		const separateChildren = group == ChildGroup.truth || group == ChildGroup.relevance;
		const showArgumentsControlBar = /* (node.type == NodeType.claim || combineWithChildClaim) && */ expanded && nodeChildrenToShow != emptyArray_forLoading && group != ChildGroup.freeform;

		let {width, height} = this.GetMeasurementInfo();
		if (widthOverride) {
			width = widthOverride;
		}

		const hovered_main = hovered && !hovered_button;
		//const ratingPanelShow = (nodeView && nodeView[`selected_${childGroupStr}`]) || hovered_main; // || local_selected;
		const ratingPanelShow = false; // disabled for now, since arguably too distracting for new users

		UseEffect(()=>{
			if (this.expandableBox?.DOM == null) return; // can be null if, for example, an error occurred during the box's rendering
			this.expandableBox!.DOM!.addEventListener("mouseenter", ()=>document.querySelectorAll(".scrolling").length == 0 && this.SetState({hovered: true}));
			this.expandableBox!.DOM!.addEventListener("mouseleave", ()=>this.SetState({hovered: false}));
			this.expandableBox!.expandButton!.DOM!.addEventListener("mouseenter", ()=>document.querySelectorAll(".scrolling").length == 0 && this.SetState({hovered_button: true}));
			this.expandableBox!.expandButton!.DOM!.addEventListener("mouseleave", ()=>this.SetState({hovered_button: false}));
		});

		const {ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath, {
			color: group == ChildGroup.truth || group == ChildGroup.relevance
				? GetNodeColor({type: "claim"} as any, "raw", false).css()
				: GetNodeColor({type: NodeType.category} as any, "raw", false).css(),
				gutterWidth: inBelowGroup ? GUTTER_WIDTH_SMALL : GUTTER_WIDTH, parentGutterWidth: GUTTER_WIDTH,
		});

		return (
			<>
			<Row className="NodeChildHolderBox clickThrough"
				ref={useCallback(c=>{
					const dom = GetDOM(c);
					ref_leftColumn(dom);
					if (dom) {
						dom["nodeGroup"] = ref_group.current;
						if (ref_group.current) dom.classList.add(`lcForNodeGroup_${ref_group.current.path}`);
					}
				}, [ref_leftColumn, ref_group])}
				style={E(
					{
						//position: "relative",
						position: "absolute",
						/* removal fixes */
						alignItems: "flex-start",
						/* marginLeft: `calc(100% - ${width}px)`, */
						//width: width + 30, // need space for gutter
						width, // need space for gutter
						boxSizing: "content-box",
						paddingLeft: GUTTER_WIDTH + (inBelowGroup ? GUTTER_WIDTH_SMALL : 0),
						color: liveSkin.NodeTextColor().css(),
					},
					//isMultiPremiseArgument && {marginTop: 10, marginBottom: 5},
					// if we don't know our inner-box-offset yet, render still (so we can measure ourself), but make self invisible
					//expanded && nodeChildrenToShow.length && innerBoxOffset == null && {opacity: 0, pointerEvents: "none"},
				)}
			>
				<ExpandableBox {...{width, widthOverride, expanded}} innerWidth={width}
					ref={c=>{
						this.expandableBox = c;
						if (ref_expandableBox) ref_expandableBox(c);
						/*ref_leftColumn.current = GetDOM(c) as any;
						if (ref_leftColumn.current && ref_leftColumn_group.current) ref_leftColumn.current.classList.add(`lcForNodeGroup_${ref_leftColumn_group.current.path}`);*/
					}}
					//style={{marginTop: innerBoxOffset_safe}}
					padding="2px 5px"
					text={
						<>
							{/* for now, leave out the ratings-preview for these child-holder boxes; it has usefulness, but it's arguably too distracting atm */}
							{/*(group == ChildGroup.truth || group == ChildGroup.relevance) &&
							<RatingsPreviewBackground path={path} node={node} ratingType={group == ChildGroup.truth ? NodeRatingType.truth : NodeRatingType.relevance}/>*/}
							<span style={ES(
								{position: "relative", fontSize: 13},
							)}>{text}</span>
						</>
					}
					{...E(
						{backgroundFillPercent: backgroundFillPercent ?? 0, backgroundColor, markerPercent},
						GADDemo && {backgroundFillPercent: 100, backgroundColor: Chroma(HSLA(0, 0, 1)) as chroma.Color},
					)}
					toggleExpanded={UseCallback(e=>{
						const newExpanded = !nodeView[expandKey];
						const recursivelyCollapsing = !newExpanded && e.altKey;
						RunInAction("NodeChildHolderBox_toggleExpanded", ()=>{
							if (group == ChildGroup.truth) {
								ACTNodeExpandedSet({
									mapID: map.id, path, resetSubtree: recursivelyCollapsing,
									[expandKey]: newExpanded,
								});
							} else {
								ACTNodeExpandedSet({
									mapID: map.id, path, resetSubtree: false,
									[expandKey]: newExpanded,
								});
								if (recursivelyCollapsing) {
									for (const child of nodeChildrenToShow) {
										ACTNodeExpandedSet({
											mapID: map.id, path: `${path}/${child.id}`, resetSubtree: true,
											[expandKey]: newExpanded,
										});
									}
								}
							}
						});
						e.nativeEvent["ignore"] = true; // for some reason, "return false" isn't working
						// return false;
						if (nodeView[expandKey]) {
							this.CheckForChanges();
						}
					}, [expandKey, map.id, nodeChildrenToShow, nodeView, path, group])}
					afterChildren={<>
						{ratingPanelShow &&
							<div ref={c=>this.ratingPanelHolder = c} style={{
								position: "absolute", left: 0, top: "calc(100% + 1px)",
								width, minWidth: (widthOverride ?? 0).KeepAtLeast(nodeBottomPanel_minWidth), zIndex: hovered_main ? 6 : 5,
								padding: 5, background: backgroundColor.css(), borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
							}}>
								<RatingsPanel node={node} path={path} ratingType={childGroupStr as NodeRatingType}/>
							</div>}
						<NodeUI_Menu_Stub {...{map, node, path}} childGroup={group}/>
					</>}
				/>
				{nodeChildrenToShow != emptyArray && !expanded && nodeChildrenToShow.length != 0 &&
					<NodeChildCountMarker {...{map, path}} childCount={nodeChildrenToShow.length}/>}
			</Row>
			{nodeView[expandKey] &&
			<NodeChildHolder ref={c=>this.childHolder = c}
				{...{map, node, path, treePath, nodeChildrenToShow, group, separateChildren, showArgumentsControlBar}}
				usesGenericExpandedField={false}
				onSizesChange={this.CheckForChanges}/>}
			</>
		);
	}

	get Expanded() {
		const {map, path, group} = this.props;
		const expandKey = `expanded_${ChildGroup[group].toLowerCase()}`;
		const nodeView = GetNodeView(map.id, path);
		return nodeView[expandKey];
	}

	expandableBox: ExpandableBox|n;
	ratingPanelHolder: HTMLDivElement|n;
	ratingPanel: RatingsPanel|n;
	childHolder: NodeChildHolder|n;

	PostRender() {
		this.CheckForChanges();
	}

	//lastLineHolderHeight = 0;
	lastHeight = 0;
	lastDividePoint = 0;
	CheckForChanges = ()=>{
		//FlashComp(this, {text: "NodeChildHolderBox.CheckForChanges"});
		const {onSizesChange} = this.props;

		//const height = $(GetDOM(this)).outerHeight();
		//const height = GetDOM(this)!.getBoundingClientRect().height;
		const height = this.DOM_HTML.offsetHeight;
		const dividePoint = this.childHolder && this.Expanded ? this.childHolder.GetDividePoint() : 0;
		if (height != this.lastHeight || dividePoint != this.lastDividePoint) {
			if (onSizesChange) onSizesChange(dividePoint, height - dividePoint);
		}
		this.lastHeight = height;
		this.lastDividePoint = dividePoint;
	};

	GetMeasurementInfo() {
		// return {width: 90, height: 26};
		return {width: 90, height: 22};
	}
}