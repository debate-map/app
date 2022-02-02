import {ArgumentType, ChildGroup, GetParentNodeL3, IsMultiPremiseArgument, IsPremiseOfSinglePremiseArgument, Map, MapNodeL3, MapNodeType, NodeRatingType} from "dm_common";
import React from "react";
import {GetNodeColor} from "Store/db_ext/nodes";
import {ACTMapNodeExpandedSet, GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {GADDemo} from "UI/@GAD/GAD.js";
import {SLSkin} from "Utils/Styles/Skins/SLSkin.js";
import {ES, HSLA, Observer, RunInAction} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
import {E, emptyArray, emptyArray_forLoading} from "web-vcore/nm/js-vextensions.js";
import {Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, UseCallback, UseEffect, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {nodeBottomPanel_minWidth} from "../DetailBoxes/NodeUI_BottomPanel.js";
import {RatingsPanel} from "../DetailBoxes/Panels/RatingsPanel.js";
import {ExpandableBox} from "../ExpandableBox.js";
import {NodeUI_Menu_Stub} from "../NodeUI_Menu.js";
import {NodeChildCountMarker} from "./NodeChildCountMarker.js";
import {NodeChildHolder} from "./NodeChildHolder.js";

type Props = {
	map: Map, node: MapNodeL3, path: string, nodeChildren: MapNodeL3[], nodeChildrenToShow: MapNodeL3[],
	group: ChildGroup, widthOfNode: number, heightOfNode: number, widthOverride?: number, onHeightOrDividePointChange?: (height: number, dividePoint: number)=>void,
	ref_expandableBox?: (c: ExpandableBox|n)=>any,
};

@WarnOfTransientObjectProps
@Observer
export class NodeChildHolderBox extends BaseComponentPlus({} as Props, {innerBoxOffset: null as number|n, lineHolderHeight: 0, hovered: false, hovered_button: false}) {
	static ValidateProps(props: Props) {
		const {node, nodeChildren} = props;
		// ms only asserts in dev for now (and only as warning); causes error sometimes when cut+pasting otherwise (firebase doesn`t send DB updates atomically?)
		/*if (DEV) {
			AssertWarn(nodeChildren.every(a=>a == null || (a.parents || {})[node.id] != null), "Supplied node is not a parent of all the supplied node-children!");
		}*/
	}
	//lineHolder: HTMLDivElement|n;
	render() {
		const {map, node, path, nodeChildren, nodeChildrenToShow, group, widthOfNode, heightOfNode, widthOverride, ref_expandableBox} = this.props;
		const {innerBoxOffset, lineHolderHeight, hovered, hovered_button} = this.state;
		const innerBoxOffset_safe = innerBoxOffset ?? 0;

		// const nodeView = GetNodeView(map.id, path) ?? new MapNodeView();
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
			group == ChildGroup.truth ? "True?" :
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
		const backgroundColor = GetNodeColor({type: group == ChildGroup.freeform ? MapNodeType.category : MapNodeType.claim} as any as MapNodeL3);
		// let lineColor = GetNodeColor(node, "raw");
		const lineColor = GetNodeColor({type: MapNodeType.claim} as any as MapNodeL3, "raw");

		//const lineOffset = 50.0.KeepAtMost(innerBoxOffset);
		// let expandKey = type == ChildGroup.truth ? "expanded_truth" : "expanded_relevance";
		const childGroupStr = ChildGroup[group].toLowerCase();
		const expandKey = `expanded_${childGroupStr}`;
		const expanded = nodeView[expandKey]; // this.Expanded

		//const separateChildren = (node.type == MapNodeType.claim || node.type == MapNodeType.argument) && group != ChildGroup.freeform;
		const separateChildren = group == ChildGroup.truth || group == ChildGroup.relevance;
		const showArgumentsControlBar = /* (node.type == MapNodeType.claim || combineWithChildClaim) && */ expanded && nodeChildrenToShow != emptyArray_forLoading && group != ChildGroup.freeform;

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

		return (
			<>
			{/*<div ref={c=>this.lineHolder = c} className="clickThroughChain" style={{
				position: "absolute",
				//right: "100%",
				top: 0, bottom: 0, width: 30, // these aren't actually necessary, but make dev-tools rectangles a bit less confusing
			}}>
				{group == ChildGroup.truth &&
					<Squiggle start={new Vector2(0, heightOfNode / 2)} startControl_offset={new Vector2(10, 0)}
						end={new Vector2(30, innerBoxOffset + (height / 2))} endControl_offset={new Vector2(-10, 0)} color={lineColor}/>}
				{group == ChildGroup.relevance && !isMultiPremiseArgument &&
					<Squiggle start={new Vector2(0, heightOfNode / 2)} startControl_offset={new Vector2(10, 0)}
						end={new Vector2(30, innerBoxOffset + (height / 2))} endControl_offset={new Vector2(-10, 0)} color={lineColor}/>}
				{group == ChildGroup.relevance && isMultiPremiseArgument &&
					<div style={{position: "absolute", right: "100%", width: 10, top: innerBoxOffset + (height / 2) - 2, height: 3, backgroundColor: lineColor.css()}}/>}
			</div>*/}
			<Row ml={30} className="clickThrough NodeChildHolderBox" style={E(
				{position: "relative", alignItems: "flex-start"},
				//! isMultiPremiseArgument && {alignSelf: "flex-end"},
				//!isMultiPremiseArgument && {left: `calc(${widthOfNode}px - ${width}px)`},
				isMultiPremiseArgument && {marginTop: 10, marginBottom: 5},
				// if we don't know our inner-box-offset yet, render still (so we can measure ourself), but make self invisible
				expanded && nodeChildrenToShow.length && innerBoxOffset == null && {opacity: 0, pointerEvents: "none"},
			)}>
				<Row className="clickThrough" style={E(
					{position: "relative", /* removal fixes */ alignItems: "flex-start", /* marginLeft: `calc(100% - ${width}px)`, */ width},
				)}>
					<ExpandableBox {...{width, widthOverride, expanded}} innerWidth={width}
						ref={c=>{
							this.expandableBox = c;
							if (ref_expandableBox) ref_expandableBox(c);
						}}
						style={{marginTop: innerBoxOffset_safe}}
						padding="2px 5px"
						text={
							<>
								{/* for now, leave out the ratings-preview for these child-holder boxes; it has usefulness, but it's arguably too distracting atm */}
								{/*(group == ChildGroup.truth || group == ChildGroup.relevance) &&
								<RatingsPreviewBackground path={path} node={node} ratingType={group == ChildGroup.truth ? NodeRatingType.truth : NodeRatingType.relevance}/>*/}
								<span style={ES(
									{position: "relative", fontSize: 13},
									GADDemo && {
										color: HSLA(222, 0.33, 0.25, 1), fontFamily: SLSkin.main.MainFont(), //fontSize: 11, letterSpacing: 1
									},
								)}>{text}</span>
							</>
						}
						{...E(
							{backgroundFillPercent: backgroundFillPercent ?? 0, backgroundColor, markerPercent},
							GADDemo && {backgroundFillPercent: 100, backgroundColor: chroma(HSLA(0, 0, 1)) as chroma.Color},
						)}
						toggleExpanded={UseCallback(e=>{
							const newExpanded = !nodeView[expandKey];
							const recursivelyCollapsing = !newExpanded && e.altKey;
							RunInAction("NodeChildHolderBox_toggleExpanded", ()=>{
								if (group == ChildGroup.truth) {
									ACTMapNodeExpandedSet({
										mapID: map.id, path, resetSubtree: recursivelyCollapsing,
										[expandKey]: newExpanded,
									});
								} else {
									ACTMapNodeExpandedSet({
										mapID: map.id, path, resetSubtree: false,
										[expandKey]: newExpanded,
									});
									if (recursivelyCollapsing) {
										for (const child of nodeChildrenToShow) {
											ACTMapNodeExpandedSet({
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
						<NodeChildCountMarker childCount={nodeChildrenToShow.length}/>}
					{/*! nodeView.expanded && (addedDescendants > 0 || editedDescendants > 0) &&
						<NodeChangesMarker {...{addedDescendants, editedDescendants, textOutline, limitBarPos}}/> */}
				</Row>
				{nodeView[expandKey] &&
					<NodeChildHolder ref={c=>this.childHolder = c}
						{...{map, node, path, nodeChildrenToShow, group, separateChildren, showArgumentsControlBar}}
						usesGenericExpandedField={false}
						linkSpawnPoint={innerBoxOffset_safe + (height / 2)}
						onHeightOrDividePointChange={this.CheckForChanges}/>}
			</Row>
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
		const {onHeightOrDividePointChange} = this.props;

		/*if (this.lineHolder == null) return;
		//const lineHolderHeight = $(this.lineHolder).outerHeight();
		//const lineHolderHeight = this.lineHolder.height.height + /*this.lineHolder.marginTop + this.lineHolder.marginBottom*#/ + document.body.borderTop + document.body.borderBottom;
		const lineHolderHeight = this.lineHolder.getBoundingClientRect().height;
		if (lineHolderHeight != this.lastLineHolderHeight) {
			this.SetState({lineHolderHeight});
		}
		this.lastLineHolderHeight = lineHolderHeight;*/

		//const height = $(GetDOM(this)).outerHeight();
		//const height = GetDOM(this)!.getBoundingClientRect().height;
		const height = this.DOM_HTML.offsetHeight;
		const dividePoint = this.childHolder && this.Expanded ? this.childHolder.GetDividePoint() : 0;
		if (height != this.lastHeight || dividePoint != this.lastDividePoint) {
			/* if (height != this.lastHeight) {
				this.OnHeightChange();
			} */
			if (dividePoint != this.lastDividePoint) {
				const {height} = this.GetMeasurementInfo();
				const distFromInnerBoxTopToMainBoxCenter = height / 2;
				const innerBoxOffset = (dividePoint - distFromInnerBoxTopToMainBoxCenter).NaNTo(0).KeepAtLeast(0);
				this.SetState({innerBoxOffset});
			}

			if (onHeightOrDividePointChange) onHeightOrDividePointChange(height, dividePoint);
		}
		this.lastHeight = height;
		this.lastDividePoint = dividePoint;
	};

	GetMeasurementInfo() {
		// return {width: 90, height: 26};
		return {width: 90, height: 22};
	}
}