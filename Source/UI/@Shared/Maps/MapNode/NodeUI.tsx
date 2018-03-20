import { ACTMapNodeExpandedSet, ACTMapNodeChildLimitSet } from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {BaseComponent, Instant, FindDOM, SimpleShouldUpdate, BaseProps, GetInnerComp, ShallowCompare, RenderSource, ShallowEquals, ShallowChanged, BaseComponentWithConnector} from "react-vextensions";
import {connect} from "react-redux";
import {DBPath, GetData, SlicePath} from "../../../../Frame/Database/DatabaseHelpers";
import {Debugger, QuickIncrement, E, GetTimeSinceLoad} from "../../../../Frame/General/Globals_Free";
import {Button, Div} from "react-vcomponents";
import {PropTypes, Component} from "react";
import Action from "../../../../Frame/General/Action";
import {Log} from "../../../../Frame/General/Logging";
import {WaitXThenRun, Timer} from "js-vextensions";
import VMenuTest1 from "react-vmenu";
import VMenu, {VMenuItem} from "react-vmenu";
import {Select} from "react-vcomponents";
import {GetEntries} from "../../../../Frame/General/Enums";
import {ShowMessageBox} from "react-vmessagebox";
import {TextInput} from "react-vcomponents";
import {DN} from "js-vextensions";
import {DataSnapshot} from "firebase";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import {createSelector} from "reselect";
import {NodeUI_Inner} from "./NodeUI_Inner";
import {createMarkupForStyles} from "react-dom/lib/CSSPropertyOperations";
import NodeConnectorBackground from "./NodeConnectorBackground";
import {Vector2i} from "js-vextensions";
import {CachedTransform, CombineDynamicPropMaps, GetContentHeight, GetContentWidth, A} from "js-vextensions";
import {RootState} from "../../../../Store/index";
import {GetNodeView} from "../../../../Store/main/mapViews";
import {MapNode, ClaimForm, MapNodeL2, AccessLevel, MapNodeL3, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {GetNodeChildren, GetParentNode, IsRootNode, GetNodeChildrenL3, GetParentNodeL2, GetNodeID, GetParentNodeL3} from "../../../../Store/firebase/nodes";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {MapNodeType, MapNodeType_Info, GetNodeColor} from "../../../../Store/firebase/nodes/@MapNodeType";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetRatingAverage, GetRatingAverage_AtPath} from "../../../../Store/firebase/nodeRatings";
import {Column} from "react-vcomponents";
import {GetRatingTypesForNode, GetNodeDisplayText, GetFontSizeForNode, GetNodeForm, GetMainRatingType, GetSortByRatingType, IsNodeL3, IsNodeL2, AsNodeL3, AsNodeL2, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument, IsMultiPremiseArgument} from "../../../../Store/firebase/nodes/$node";
import FastDOM from "fastdom";
import {Row} from "react-vcomponents";
import Icon from "../../../../Frame/ReactComponents/Icon";
import {GetUserAccessLevel} from "../../../../Store/firebase/users";
import {GetUserID} from "Store/firebase/users";
import {IsUserCreatorOrMod} from "../../../../Store/firebase/userExtras";
import {ViewedNodeSet} from "../../../../Store/firebase/userViewedNodes/@ViewedNodeSet";
import {GetUserViewedNodes} from "../../../../Store/firebase/userViewedNodes";
import NotifyNodeViewed from "../../../../Server/Commands/NotifyNodeViewed";
import InfoButton from "../../../../Frame/ReactComponents/InfoButton";
import {emptyArray, emptyArray_forLoading, emptyObj} from "../../../../Frame/Store/ReducerUtils";
import {GetSubnodesInEnabledLayersEnhanced} from "../../../../Store/firebase/layers";
import { GetPlayingTimelineAppliedStepRevealNodes } from "Store/main/maps/$map";
import {GetPlayingTimeline, GetPlayingTimelineRevealNodes, GetPlayingTimelineStepIndex, GetPlayingTimelineCurrentStepRevealNodes, GetTimeFromWhichToShowChangedNodes} from "../../../../Store/main/maps/$map";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import { ChangeType } from "Store/firebase/mapNodeEditTimes";
import {GetPathsToNodesChangedSinceX, GetNodeChangeType, GetChangeTypeOutlineColor} from "../../../../Store/firebase/mapNodeEditTimes";
import {GetNode} from "Store/firebase/nodes";
import {MapNodeRevision, ArgumentType} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import { PremiseAddHelper } from "UI/@Shared/Maps/MapNode/PremiseAddHelper";
import { ArgumentsControlBar } from "UI/@Shared/Maps/MapNode/ArgumentsControlBar";
import { AddArgumentButton } from "UI/@Shared/Maps/MapNode/NodeUI/AddArgumentButton";
import classNames from "classnames";
import chroma from "chroma-js";
import { ChildLimitBar, NodeChildHolder } from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolder";
import { NodeChildHolderBox, HolderType } from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolderBox";

let nodesLocked = {};
export function SetNodeUILocked(nodeID: number, locked: boolean, maxWait = 10000) {
	nodesLocked[nodeID] = locked;
	if (locked) {
		setTimeout(()=>SetNodeUILocked(nodeID, false), maxWait);
	}
}

type Props = {map: Map, node: MapNodeL3, path?: string, asSubnode?: boolean, widthOverride?: number, style?, onHeightOrPosChange?: ()=>void};
let connector = (state, {node, path, map}: Props)=> {
	//Log("Calling NodeUI connect func.");
	let nodeView = GetNodeView(map._id, path) || new MapNodeView();

	let nodeChildren = GetNodeChildrenL3(node, path, true);
	nodeChildren = nodeChildren.Any(a=>a == null) ? emptyArray_forLoading : nodeChildren; // only pass nodeChildren when all are loaded
	//nodeChildren = nodeChildren.filter(a=>a);
	/*let nodeChildren_finalTypes = nodeChildren == emptyArray ? emptyArray : nodeChildren.map(child=> {
		return GetFinalNodeTypeAtPath(child, path + "/" + child._id);
	});*/

	let nodeChildren_sortValues = nodeChildren == emptyArray ? emptyObj : nodeChildren.ToMap(child=>child._id+"", child=> {
		return GetRatingAverage_AtPath(child, GetSortByRatingType(child));
	});
	let nodeChildren_fillPercents = nodeChildren == emptyArray ? emptyObj : nodeChildren.ToMap(child=>child._id+"", child=> {
		return GetRatingAverage_AtPath(child, GetMainRatingType(child));
	});

	let subnodes = GetSubnodesInEnabledLayersEnhanced(GetUserID(), map, node._id);
	subnodes = subnodes.Any(a=>a == null) ? emptyArray : subnodes; // only pass subnodes when all are loaded

	let sinceTime = GetTimeFromWhichToShowChangedNodes(map._id);
	let pathsToChangedNodes = GetPathsToNodesChangedSinceX(map._id, sinceTime);
	let pathsToChangedDescendantNodes = pathsToChangedNodes.filter(a=>a.startsWith(path + "/"));
	let changeTypesOfChangedDescendantNodes = pathsToChangedDescendantNodes.map(path=>GetNodeChangeType(GetNode(GetNodeID(path)), sinceTime));
	let addedDescendants = changeTypesOfChangedDescendantNodes.filter(a=>a == ChangeType.Add).length;
	let editedDescendants = changeTypesOfChangedDescendantNodes.filter(a=>a == ChangeType.Edit).length;

	return {
		path: path || node._id.toString(),

		initialChildLimit: State(a=>a.main.initialChildLimit),
		//node_finalType: GetFinalNodeTypeAtPath(node, path),
		//nodeEnhanced: GetNodeL3(path),
		form: GetNodeForm(node, GetParentNodeL2(path)),
		// only pass new nodeView when its local-props are different
		nodeView: CachedTransform("nodeView_transform1", [map._id, path], nodeView.Excluding("focused", "viewOffset", "children"), ()=>nodeView),
		/*nodeChildren: CachedTransform("nodeChildren_transform1", {path}, CombineDynamicPropMaps(nodeChildren, nodeChildren_finalTypes),
			()=>nodeChildren.map((child, index)=> {
				return child.Extended({finalType: nodeChildren_finalTypes[index]});
			})),*/
		nodeChildren,
		nodeChildren_sortValues: CachedTransform("nodeChildren_sortValues_transform1", [node._id], nodeChildren_sortValues, ()=>nodeChildren_sortValues),
		nodeChildren_fillPercents: CachedTransform("nodeChildren_fillPercents_transform1", [node._id], nodeChildren_fillPercents, ()=>nodeChildren_fillPercents),
		subnodes,
		userViewedNodes: GetUserViewedNodes(GetUserID(), {useUndefinedForInProgress: true}),
		playingTimeline: GetPlayingTimeline(map._id),
		playingTimeline_currentStepIndex: GetPlayingTimelineStepIndex(map._id),
		playingTimelineShowableNodes: GetPlayingTimelineRevealNodes(map._id),
		playingTimelineVisibleNodes: GetPlayingTimelineAppliedStepRevealNodes(map._id, true),
		playingTimeline_currentStepRevealNodes: GetPlayingTimelineCurrentStepRevealNodes(map._id),
		addedDescendants,
		editedDescendants,
	};
};



@Connect(connector)
export class NodeUI extends BaseComponentWithConnector(connector, {expectedBoxWidth: 0, expectedBoxHeight: 0, innerBoxOffset: 0}) {
	static renderCount = 0;
	static lastRenderTime = -1;
	static ValidateProps(props) {
		let {node} = props;
		Assert(IsNodeL2(node), "Node supplied to NodeUI is not level-2!");
		Assert(IsNodeL3(node), "Node supplied to NodeUI is not level-3!");
	}
	
	// for SetNodeUILocked() function above
	waitForUnlockTimer: Timer;
	shouldComponentUpdate(newProps, newState) {
		let changed = ShallowChanged(this.props, newProps) || ShallowChanged(this.state, newState);
		let {node} = this.props;
		if (!nodesLocked[node._id]) return changed;

		// node-ui is locked, so wait until it gets unlocked, then update the ui
		if (this.waitForUnlockTimer == null) {
			this.waitForUnlockTimer = new Timer(100, ()=> {
				if (nodesLocked[node._id]) return;
				this.waitForUnlockTimer.Stop();
				delete this.waitForUnlockTimer;
				this.Update();
			}).Start();
		}
		return false;
	}

	nodeUI: HTMLDivElement;
	innerUI: NodeUI_Inner;
	render() {
		let {map, node, path, asSubnode, widthOverride, style, onHeightOrPosChange,
			initialChildLimit, form, children, nodeView, nodeChildren: nodeChildren_orig, nodeChildren_sortValues, subnodes,
			playingTimeline, playingTimeline_currentStepIndex, playingTimelineShowableNodes, playingTimelineVisibleNodes, playingTimeline_currentStepRevealNodes,
			addedDescendants, editedDescendants} = this.props;
		let {innerBoxOffset} = this.state;
		let expanded = nodeView && nodeView.expanded;
		if (ShouldLog(a=>a.nodeRenders)) {
			if (logTypes.nodeRenders_for) {
				if (logTypes.nodeRenders_for == node._id) {
					Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node._id}${nl
						}PropsChanged:${this.GetPropsChanged_Data()}${nl
						}StateChanged:${this.GetStateChanged_Data()}`);
				}
			} else {
				Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node._id}${nl
					}PropsChanged:${this.GetPropsChanged()}${nl
					}StateChanged:${this.GetStateChanged()}`);
			}
		}
		NodeUI.renderCount++;
		NodeUI.lastRenderTime = Date.now();

		let nodeChildrenToShow = nodeChildren_orig;

		/*if (node.type == MapNodeType.Argument && nodeChildren.length == 1 && GetUserID() == node.creator) {
			let fakeChild = AsNodeL3(AsNodeL2(new MapNode({type: MapNodeType.Claim}), new MapNodeRevision({})));
			fakeChild.premiseAddHelper = true;
			nodeChildren = [...nodeChildren, fakeChild];
		}*/

		let separateChildren = node.type == MapNodeType.Claim;
		//let nodeChildren_filtered = nodeChildren;
		if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
			nodeChildrenToShow = nodeChildrenToShow.filter(child=>playingTimelineVisibleNodes.Contains(path + "/" + child._id));
		}
		let upChildren = separateChildren ? nodeChildrenToShow.filter(a=>a.finalPolarity == Polarity.Supporting) : [];
		let downChildren = separateChildren ? nodeChildrenToShow.filter(a=>a.finalPolarity == Polarity.Opposing) : [];

		// apply sorting
		if (separateChildren) {
			upChildren = upChildren.OrderBy(child=>nodeChildren_sortValues[child._id]);
			downChildren = downChildren.OrderByDescending(child=>nodeChildren_sortValues[child._id]);
		} else {
			nodeChildrenToShow = nodeChildrenToShow.OrderByDescending(child=>nodeChildren_sortValues[child._id]);
			//if (IsArgumentNode(node)) {
			let isArgument_any = node.type == MapNodeType.Argument && node.current.argumentType == ArgumentType.Any;
			if (node.childrenOrder && !isArgument_any) {
				nodeChildrenToShow = nodeChildrenToShow.OrderBy(child=>node.childrenOrder.indexOf(child._id).IfN1Then(Number.MAX_SAFE_INTEGER));
			}
		}

		// if the premise of a single-premise argument
		let parent = GetParentNodeL3(path);
		let isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);
		if (isPremiseOfSinglePremiseArg) {
			var relevanceArguments = GetNodeChildrenL3(parent, SlicePath(path, 1)).Except(node);
		}

		let isSinglePremiseArgument = IsSinglePremiseArgument(node, nodeChildren_orig);
		let isMultiPremiseArgument = IsMultiPremiseArgument(node, nodeChildren_orig);
		let showArgumentsControlBar = (node.type == MapNodeType.Claim || isSinglePremiseArgument) && expanded && nodeChildrenToShow != emptyArray_forLoading;

		let {width, expectedHeight} = this.GetMeasurementInfo();
		/*let innerBoxOffset = this.GetInnerBoxOffset(expectedHeight, showAddArgumentButtons, childrenCenterY);
		if (!expanded) innerBoxOffset = 0;*/

		let showLimitBar = !!children; // the only type of child we ever pass into NodeUI is a LimitBar
		let limitBar_above = node.type == MapNodeType.Argument && node.finalPolarity == Polarity.Supporting;
		//if (IsReversedArgumentNode(node)) limitBar_above = !limitBar_above;
		/*let minChildCount = GetMinChildCountToBeVisibleToNonModNonCreators(node, nodeChildren);
		let showBelowMessage = nodeChildren.length > 0 && nodeChildren.length < minChildCount;*/

		let textOutline = "rgba(10,10,10,1)";

		// maybe temp
		let combineWithChildClaim = IsSinglePremiseArgument(node, nodeChildren_orig);
		if (combineWithChildClaim) {
			let childLimit_up = ((nodeView || {}).childLimit_up || initialChildLimit).KeepAtLeast(initialChildLimit);
			let childLimit_down = ((nodeView || {}).childLimit_down || initialChildLimit).KeepAtLeast(initialChildLimit);
			let showAll = node._id == map.rootNode || node.type == MapNodeType.Argument;
			//return <ChildPackUI {...{map, path, childrenWidthOverride, childLimit_up, childLimit_down, showAll}} pack={pack} index={0} collection={childPacks}/>;*#/

			let index = 0;
			let direction = "down" as any;
			let childrenWidthOverride = null;
			let child = nodeChildren_orig[0];
			let collection = nodeChildren_orig;
			let childLimit = direction == "down" ? childLimit_down : childLimit_up;
			return (
				<NodeUI ref={c=>this.proxyDisplayedNodeUI = c} key={child._id} map={map} node={child}
						path={path + "/" + child._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={onHeightOrPosChange}>
					{index == (direction == "down" ? childLimit - 1 : 0) && !showAll && (collection.length > childLimit || childLimit != initialChildLimit) &&
						<ChildLimitBar {...{map, path, childrenWidthOverride, childLimit}} direction={direction} childCount={collection.length}/>}
				</NodeUI>
			);
		}

		let nodeUIResult_withoutSubnodes = (
			<div ref={c=>this.nodeUI = c} className="NodeUI clickThrough"
					style={E(
						{position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0},
						isMultiPremiseArgument && {flexDirection: "column"},
						style,
					)}>
				<div ref="innerBoxAndSuchHolder" className="innerBoxAndSuchHolder clickThrough" style={E(
					{position: "relative"},
					/*useAutoOffset && {display: "flex", height: "100%", flexDirection: "column", justifyContent: "center"},
					!useAutoOffset && {paddingTop: innerBoxOffset},*/
					//{paddingTop: innerBoxOffset},
					{marginTop: expanded ? innerBoxOffset : 0},
				)}>
					{limitBar_above && children}
					{asSubnode &&
						<div style={{position: "absolute", left: 2, right: 2, top: -3, height: 3, borderRadius: "3px 3px 0 0", background: "rgba(255,255,0,.7)"}}/>}
					<Column ref="innerBoxHolder" className="innerBoxHolder clickThrough" style={{position: "relative"}}>
						{node.current.accessLevel != AccessLevel.Basic &&
							<div style={{position: "absolute", right: "calc(100% + 5px)", top: 0, bottom: 0, display: "flex", fontSize: 10}}>
								<span style={{margin: "auto 0"}}>{AccessLevel[node.current.accessLevel][0].toUpperCase()}</span>
							</div>}
						{isPremiseOfSinglePremiseArg && expanded &&
							<NodeChildHolderBox {...{map, node, path, nodeView}} type={HolderType.Truth} expanded={true}
								nodeChildren={nodeChildren_orig} nodeChildrenToShow={nodeChildrenToShow}/>}
						<NodeUI_Inner ref={c=>this.innerUI = GetInnerComp(c)} {...{map, node, nodeView, path, width, widthOverride}}
							style={E(
								playingTimeline_currentStepRevealNodes.Contains(path) && {boxShadow: "rgba(255,255,0,1) 0px 0px 7px, rgb(0, 0, 0) 0px 0px 2px"},
							)}/>
						{isPremiseOfSinglePremiseArg && expanded &&
							<NodeChildHolderBox {...{map, node: parent, path: SlicePath(path, 1), nodeView}} type={HolderType.Relevance} expanded={true}
								nodeChildren={GetNodeChildrenL3(parent, SlicePath(path, 1))} nodeChildrenToShow={relevanceArguments}/>}
						{/*showBelowMessage &&
							<Div ct style={{
								//whiteSpace: "normal", position: "absolute", left: 0, right: 0, top: "100%", fontSize: 12
								marginTop: 5, fontSize: 12,
								width: 0, // fixes that link-lines would have gap on left
							}}>
								Needs 2 premises to be visible.
							</Div>*/}
					</Column>
					{!limitBar_above && children}
				</div>

				{nodeChildrenToShow == emptyArray_forLoading &&
					<div style={{margin: "auto 0 auto 10px"}}>...</div>}
				{IsRootNode(node) && nodeChildrenToShow != emptyArray_forLoading && nodeChildrenToShow.length == 0 &&
					<div style={{margin: "auto 0 auto 10px", background: "rgba(0,0,0,.7)", padding: 5, borderRadius: 5}}>To add a node, right click on the root node.</div>}
				{nodeChildrenToShow != emptyArray && !expanded && nodeChildrenToShow.length != 0 &&
					<div style={E(
						{
							margin: "auto 0 auto 9px", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.8)",
							//filter: "drop-shadow(0px 0px 5px rgba(0,0,0,1))"
							textShadow: `-1px 0 ${textOutline}, 0 1px ${textOutline}, 1px 0 ${textOutline}, 0 -1px ${textOutline}`,
						},
						/*showLimitBar && {[limitBar_above ? "paddingTop" : "paddingBottom"]: ChildLimitBar.HEIGHT},
						showBelowMessage && {paddingBottom: 13},*/
						showLimitBar && limitBar_above && {paddingTop: ChildLimitBar.HEIGHT},
						{paddingBottom: 0 + /*(showBelowMessage ? 13 : 0) +*/ (showLimitBar && !limitBar_above ? ChildLimitBar.HEIGHT : 0)},
					)}>
						{nodeChildrenToShow.length}
					</div>}
				{!expanded && (addedDescendants > 0 || editedDescendants > 0) &&
					<Column style={E(
						{
							margin: "auto 0 auto 9px", fontSize: 13, fontWeight: 500,
							//filter: "drop-shadow(0px 0px 5px rgba(0,0,0,1))"
							textShadow: `-1px 0 ${textOutline}, 0 1px ${textOutline}, 1px 0 ${textOutline}, 0 -1px ${textOutline}`,
						},
						showLimitBar && limitBar_above && {paddingTop: ChildLimitBar.HEIGHT},
						{paddingBottom: 0 + (showLimitBar && !limitBar_above ? ChildLimitBar.HEIGHT : 0)},
					)}>
						{addedDescendants > 0 &&
							<Row style={{color: `rgba(${GetChangeTypeOutlineColor(ChangeType.Add)},.8)`}}>{addedDescendants} new</Row>}
						{editedDescendants > 0 &&
							<Row style={{color: `rgba(${GetChangeTypeOutlineColor(ChangeType.Edit)},.8)`}}>{editedDescendants} edited</Row>}
					</Column>}
				{!isPremiseOfSinglePremiseArg && expanded &&
					<NodeChildHolder {...{map, node, path, nodeView, nodeChildren: nodeChildren_orig, nodeChildrenToShow, separateChildren, showArgumentsControlBar}}
						linkSpawnPoint={innerBoxOffset + expectedHeight / 2}
						vertical={isMultiPremiseArgument}
						onChildrenCenterYChange={childrenCenterY=> {
							let distFromInnerBoxTopToMainBoxCenter = expectedHeight / 2;
							let innerBoxOffset = (childrenCenterY - distFromInnerBoxTopToMainBoxCenter).KeepAtLeast(0);
							this.SetState({innerBoxOffset});
							if (onHeightOrPosChange) onHeightOrPosChange();
						}}/>}
			</div>
		);

		if (subnodes.length == 0) {
			return nodeUIResult_withoutSubnodes;
		}
		return (
			<div className="clickThrough" style={{display: "flex", flexDirection: "column"}}>
				{nodeUIResult_withoutSubnodes}
				{subnodes.map((subnode, index)=> {
					return (
						<NodeUI key={index} map={map} node={subnode} asSubnode={true} style={E({marginTop: -5})}
							path={`${path}/L${subnode._id}`} widthOverride={widthOverride} onHeightOrPosChange={onHeightOrPosChange}/>
					);
				})}
			</div>
		);
	}
	proxyDisplayedNodeUI: NodeUI;
	get NodeUIForDisplayedNode() {
		return this.proxyDisplayedNodeUI || this;
	}

	//GetMeasurementInfo(/*props: Props, state: State*/) {
	measurementInfo_cache;
	measurementInfo_cache_lastUsedProps;
	/*ComponentWillReceiveProps(newProps) {
		this.GetMeasurementInfo(newProps, false); // refresh measurement-info when props change
	}*/
	//GetMeasurementInfo(useCached: boolean) {
	GetMeasurementInfo() {
		let {nodeChildren} = this.props;
		let props_used = this.props.Including("node", "path", "subnodes") as any;
		//Log("Checking whether should remeasure info for: " + props_used.node._id);
		if (this.measurementInfo_cache && ShallowEquals(this.measurementInfo_cache_lastUsedProps, props_used)) return this.measurementInfo_cache;

		let {node, path, subnodes} = props_used as Props & {subnodes: MapNodeL3[]};
		let {expectedBoxWidth, width, expectedHeight} = GetMeasurementInfoForNode(node, path);

		for (let subnode of subnodes) {
			let subnodeMeasurementInfo = GetMeasurementInfoForNode(subnode, ""+subnode._id);
			expectedBoxWidth = Math.max(expectedBoxWidth, subnodeMeasurementInfo.expectedBoxWidth);
		}

		let isMultiPremiseArgument = IsMultiPremiseArgument(node, nodeChildren);
		if (isMultiPremiseArgument) {
			expectedBoxWidth = expectedBoxWidth.KeepAtLeast(350);
			width = width.KeepAtLeast(350);
			expectedBoxWidth += 30;
			width += 30;
		}

		this.measurementInfo_cache = {expectedBoxWidth, width, expectedHeight};
		this.measurementInfo_cache_lastUsedProps = props_used;
		return this.measurementInfo_cache;
	}

	ComponentDidMount() {
		let {node, userViewedNodes} = this.props;
		if (GetUserID() == null) return;

		let userViewedNodes_doneLoading = userViewedNodes !== undefined;
		if (userViewedNodes_doneLoading && !(userViewedNodes || {}).VKeys(true).map(ToInt).Contains(node._id)) {
			new NotifyNodeViewed({nodeID: node._id}).Run();
		}
	}

	lastHeight = 0;
	PostRender() {
		//if (this.lastRender_source == RenderSource.SetState) return;

		let height = $(FindDOM(this)).outerHeight();
		if (height != this.lastHeight) {
			this.OnHeightChange(height);
		} /*else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateState();
			this.ReportChildrenCenterYChange();
		}*/
		this.lastHeight = height;
	}
	OnHeightChange(height: number) {
		let {node, onHeightOrPosChange} = this.props;
		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
			()=>`OnHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
				}NewHeight:${height}`);
		
		//this.UpdateState(true);
		//this.UpdateState();
		if (onHeightOrPosChange) onHeightOrPosChange();
	}
}

/*interface JQuery {
	positionFrom(referenceControl): void;
}*/
/*setTimeout(()=>$.fn.positionFrom = function(referenceControl) {
	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return {left: offset.left - referenceControlOffset.left, top: offset.top - referenceControlOffset.top};
});*/

function GetMeasurementInfoForNode(node: MapNodeL3, path: string) {
	let nodeTypeInfo = MapNodeType_Info.for[node.type];

	let displayText = GetNodeDisplayText(node, path);
	let fontSize = GetFontSizeForNode(node);
	let expectedTextWidth = GetContentWidth($(`<span style='${createMarkupForStyles({fontSize, whiteSpace: "nowrap"})}'>${displayText}</span>`));

	let noteWidth = 0;
	if (node.current.note) {
		noteWidth = Math.max(noteWidth,
			GetContentWidth($(`<span style='${createMarkupForStyles({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>${node.current.note}</span>`), true));
	}
	if (node.current.equation && node.current.equation.explanation) {
		noteWidth = Math.max(noteWidth,
			GetContentWidth($(`<span style='${createMarkupForStyles({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>${node.current.equation.explanation}</span>`), true));
	}
	expectedTextWidth += noteWidth;

	//let expectedOtherStuffWidth = 26;
	let expectedOtherStuffWidth = 28;
	if (node.current.contentNode)
		expectedOtherStuffWidth += 14;
	let expectedBoxWidth = expectedTextWidth + expectedOtherStuffWidth;
	if (node.current.contentNode) // quotes are often long, so just always do full-width
		expectedBoxWidth = nodeTypeInfo.maxWidth;

	let width = node.current.widthOverride || expectedBoxWidth.KeepBetween(nodeTypeInfo.minWidth, nodeTypeInfo.maxWidth);

	let maxTextWidth = width - expectedOtherStuffWidth;
	let expectedTextHeight = GetContentHeight($(`<a style='${
		createMarkupForStyles({fontSize, whiteSpace: "initial", display: "inline-block", width: maxTextWidth})
	}'>${displayText}</a>`));
	let expectedHeight = expectedTextHeight + 10; // * + top-plus-bottom-padding
	//this.Extend({expectedTextWidth, maxTextWidth, expectedTextHeight, expectedHeight}); // for debugging

	return {expectedBoxWidth, width, expectedHeight};
}