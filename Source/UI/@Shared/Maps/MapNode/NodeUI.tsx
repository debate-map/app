import { ACTMapNodeExpandedSet, ACTMapNodeChildLimitSet } from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {BaseComponent, Instant, FindDOM, SimpleShouldUpdate, BaseProps, GetInnerComp, ShallowCompare, RenderSource, ShallowEquals, ShallowChanged} from "react-vextensions";
import {connect} from "react-redux";
import {DBPath, GetData} from "../../../../Frame/Database/DatabaseHelpers";
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
import NodeUI_Inner from "./NodeUI_Inner";
import {createMarkupForStyles} from "react-dom/lib/CSSPropertyOperations";
import NodeConnectorBackground from "./NodeConnectorBackground";
import {Vector2i} from "js-vextensions";
import {CachedTransform, CombineDynamicPropMaps, GetContentHeight, GetContentWidth} from "js-vextensions";
import {RootState} from "../../../../Store/index";
import {GetNodeView} from "../../../../Store/main/mapViews";
import {MapNode, ClaimForm, MapNodeL2, AccessLevel, MapNodeL3, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {GetNodeChildren, GetParentNode, IsRootNode, GetNodeChildrenL3, GetParentNodeL2, GetNodeID} from "../../../../Store/firebase/nodes";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {MapNodeType, MapNodeType_Info} from "../../../../Store/firebase/nodes/@MapNodeType";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetFillPercentForRatingAverage, GetRatingAverage} from "../../../../Store/firebase/nodeRatings";
import {Column} from "react-vcomponents";
import {GetRatingTypesForNode, GetNodeDisplayText, GetFontSizeForNode, GetNodeForm, GetMainRatingType, GetSortByRatingType, IsNodeL3, IsNodeL2} from "../../../../Store/firebase/nodes/$node";
import FastDOM from "fastdom";
import {Row} from "react-vcomponents";
import Icon from "../../../../Frame/ReactComponents/Icon";
import {ImpactPremise_IfType} from "./../../../../Store/firebase/nodes/@ImpactPremiseInfo";
import {GetUserAccessLevel} from "../../../../Store/firebase/users";
import {GetUserID} from "Store/firebase/users";
import {IsUserCreatorOrMod} from "../../../../Store/firebase/userExtras";
import {ViewedNodeSet} from "../../../../Store/firebase/userViewedNodes/@ViewedNodeSet";
import {GetUserViewedNodes} from "../../../../Store/firebase/userViewedNodes";
import NotifyNodeViewed from "../../../../Server/Commands/NotifyNodeViewed";
import InfoButton from "../../../../Frame/ReactComponents/InfoButton";
import { emptyArray, emptyArray_forLoading } from "../../../../Frame/Store/ReducerUtils";
import {GetSubnodesInEnabledLayersEnhanced} from "../../../../Store/firebase/layers";
import { GetPlayingTimelineAppliedStepRevealNodes } from "Store/main/maps/$map";
import {GetPlayingTimeline, GetPlayingTimelineRevealNodes, GetPlayingTimelineStepIndex, GetPlayingTimelineCurrentStepRevealNodes, GetTimeFromWhichToShowChangedNodes} from "../../../../Store/main/maps/$map";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import { ChangeType } from "Store/firebase/mapNodeEditTimes";
import {GetPathsToNodesChangedSinceX, GetNodeChangeType, GetChangeTypeOutlineColor} from "../../../../Store/firebase/mapNodeEditTimes";
import {GetNode} from "Store/firebase/nodes";

let nodesLocked = {};
export function SetNodeUILocked(nodeID: number, locked: boolean) {
	nodesLocked[nodeID] = locked;
}

type Props = {map: Map, node: MapNodeL3, path?: string, asSubnode?: boolean, widthOverride?: number, style?, onHeightOrPosChange?: ()=>void}
	& Partial<{
		initialChildLimit: number, form: ClaimForm, nodeView: MapNodeView,
		nodeChildren: MapNodeL3[],
		//nodeChildren_fillPercents: number[],
		nodeChildren_sortValues: number[],
		subnodes: MapNodeL3[],
		userViewedNodes: ViewedNodeSet,
		playingTimeline: Timeline,
		playingTimeline_currentStepIndex: number,
		playingTimelineShowableNodes: string[],
		playingTimelineVisibleNodes: string[],
		playingTimeline_currentStepRevealNodes: string[],

		changeType: ChangeType, addedDescendants: number, editedDescendants: number,
	}>;
type State = {
	childrenWidthOverride: number, childrenCenterY: number,
	svgInfo: {
		mainBoxOffset: Vector2i,
		oldChildBoxOffsets: {[key: number]: Vector2i},
	},
};
@Connect((state: RootState, {node, path, map}: Props, asRecall?)=> {
	//Log("Calling NodeUI connect func.");
	let nodeView = GetNodeView(map._id, path) || new MapNodeView();

	let nodeChildren = GetNodeChildrenL3(node, path, true);
	nodeChildren = nodeChildren.Any(a=>a == null) ? emptyArray_forLoading : nodeChildren; // only pass nodeChildren when all are loaded
	//nodeChildren = nodeChildren.filter(a=>a);
	/*let nodeChildren_finalTypes = nodeChildren == emptyArray ? emptyArray : nodeChildren.map(child=> {
		return GetFinalNodeTypeAtPath(child, path + "/" + child._id);
	});*/

	let nodeChildren_sortValues = nodeChildren == emptyArray ? emptyArray : nodeChildren.map(child=> {
		if (child.current.impactPremise) return Number.MAX_SAFE_INTEGER; // always place the impact-premise first
		return GetFillPercentForRatingAverage(child, GetRatingAverage(child._id, GetSortByRatingType(child)), GetNodeForm(child) == ClaimForm.Negation);
	});
	let nodeChildren_fillPercents = nodeChildren == emptyArray ? emptyArray : nodeChildren.map(child=> {
		return GetFillPercentForRatingAverage(child, GetRatingAverage(child._id, GetMainRatingType(child)), GetNodeForm(child) == ClaimForm.Negation);
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
		//nodeEnhanced: GetNodeL3(node, path),
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
})
export default class NodeUI extends BaseComponent<Props, State> {
	static renderCount = 0;
	static lastRenderTime = -1;
	static ValidateProps(props) {
		let {node} = props;
		Assert(IsNodeL2(node), "Node supplied to NodeUI is not level-2!");
		Assert(IsNodeL3(node), "Node supplied to NodeUI is not level-3!");
	}
	
	constructor(props) {
		super(props);
		this.state = {svgInfo: {}} as any;
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
	render() {
		let {map, node, path, asSubnode, widthOverride, style,
			initialChildLimit, form, children, nodeView, nodeChildren, nodeChildren_sortValues, subnodes,
			playingTimeline, playingTimeline_currentStepIndex, playingTimelineShowableNodes, playingTimelineVisibleNodes, playingTimeline_currentStepRevealNodes,
			addedDescendants, editedDescendants} = this.props;
		let expanded = nodeView && nodeView.expanded;
		let {childrenWidthOverride, childrenCenterY, svgInfo} = this.state;
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

		let separateChildren = node.type == MapNodeType.Claim;
		type ChildPack = {origIndex: number, node: MapNodeL3};
		let childPacks: ChildPack[] = nodeChildren.map((child, index)=>({origIndex: index, node: child}));
		if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
			childPacks = childPacks.filter(pack=>playingTimelineVisibleNodes.Contains(path + "/" + pack.node._id));
		}
		let upChildPacks = separateChildren ? childPacks.filter(a=>a.node.finalPolarity == Polarity.Supporting) : [];
		let downChildPacks = separateChildren ? childPacks.filter(a=>a.node.finalPolarity == Polarity.Opposing) : [];

		let childLimit_up = ((nodeView || {}).childLimit_up || initialChildLimit).KeepAtLeast(initialChildLimit);
		let childLimit_down = ((nodeView || {}).childLimit_down || initialChildLimit).KeepAtLeast(initialChildLimit);
		// if the map's root node, or an argument node, show all children
		let showAll = node._id == map.rootNode || node.type == MapNodeType.Argument;
		if (showAll) [childLimit_up, childLimit_down] = [100, 100];

		// apply sorting
		if (separateChildren) {
			upChildPacks = upChildPacks.OrderBy(pack=>nodeChildren_sortValues[pack.origIndex]);
			downChildPacks = downChildPacks.OrderByDescending(pack=>nodeChildren_sortValues[pack.origIndex]);
		} else {
			childPacks = childPacks.OrderByDescending(pack=>nodeChildren_sortValues[pack.origIndex]);
			//if (IsArgumentNode(node)) {
			let impactPremiseNode = nodeChildren.FirstOrX(a=>a.current.impactPremise != null);
			let isArgument_any = impactPremiseNode && impactPremiseNode.current.impactPremise.ifType == ImpactPremise_IfType.Any;
			if (node.childrenOrder && !isArgument_any) {
				childPacks = childPacks.OrderBy(pack=>node.childrenOrder.indexOf(pack.node._id).IfN1Then(Number.MAX_SAFE_INTEGER));
			}
		}

		//let {width, expectedHeight} = this.GetMeasurementInfo(this.props, this.state);
		let {width, expectedHeight} = this.GetMeasurementInfo();
		let innerBoxOffset = ((childrenCenterY|0) - (expectedHeight / 2)).KeepAtLeast(0);
		if (!expanded) innerBoxOffset = 0;

		let showLimitBar = !!children; // the only type of child we ever pass into NodeUI is a LimitBar
		let limitBar_above = node.type == MapNodeType.Argument && node.finalPolarity == Polarity.Supporting;
		//if (IsReversedArgumentNode(node)) limitBar_above = !limitBar_above;
		/*let minChildCount = GetMinChildCountToBeVisibleToNonModNonCreators(node, nodeChildren);
		let showBelowMessage = nodeChildren.length > 0 && nodeChildren.length < minChildCount;*/

		let textOutline = "rgba(10,10,10,1)";
		
		this.childBoxes = {};
		let nodeUIResult_withoutSubnodes = (
			<div ref={c=>this.nodeUI = c} className="NodeUI clickThrough"
					style={E({position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0}, style)}>
				<div ref="innerBoxAndSuchHolder" className="innerBoxAndSuchHolder clickThrough" style={E(
					{position: "relative"},
					/*useAutoOffset && {display: "flex", height: "100%", flexDirection: "column", justifyContent: "center"},
					!useAutoOffset && {paddingTop: innerBoxOffset},*/
					//{paddingTop: innerBoxOffset},
					{marginTop: innerBoxOffset},
				)}>
					{limitBar_above && children}
					{/*subnodes.length != 0 &&
						<div style={{position: "absolute", left: "calc(50% - 5px)", width: 10, top: 26, bottom: 26 + 5, background: "rgba(255,255,0,.7)"}}/>*/}
					{asSubnode &&
						/*<div style={{position: "absolute", left: -8, top: "calc(50% - 7px)", width: 7, height: 14,
							borderRadius: "7px 0 0 7px", background: "rgba(255,255,0,.7)"}}/>*/
						/*<div style={{position: "absolute", left: "calc(50% - 5px)", top: -11,
							//width: 14, height: 7, transform: "rotate(45deg)", background: "rgba(255,255,0,.7)"
							width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "10px solid rgba(255,255,0,.7)",
						}}/>*/
						/*<div style={{position: "absolute", left: "calc(50% - 7px)", top: -8, width: 14, height: 7,
							borderRadius: "7px 7px 0 0", background: "rgba(255,255,0,.7)"}}/>*/
						<div style={{position: "absolute", left: 2, right: 2, top: -3, height: 3, borderRadius: "3px 3px 0 0", background: "rgba(255,255,0,.7)"}}/>
					}
					<div ref="innerBoxHolder" className="innerBoxHolder clickThrough" style={{position: "relative"}}>
						{node.current.accessLevel != AccessLevel.Basic &&
							<div style={{position: "absolute", right: "calc(100% + 5px)", top: 0, bottom: 0, display: "flex", fontSize: 10}}>
								<span style={{margin: "auto 0"}}>{AccessLevel[node.current.accessLevel][0].toUpperCase()}</span>
							</div>}
						<NodeUI_Inner ref="innerBox" map={map} node={node} nodeView={nodeView} path={path} width={width} widthOverride={widthOverride}
							style={E(
								playingTimeline_currentStepRevealNodes.Contains(path) && {boxShadow: "rgba(255,255,0,1) 0px 0px 7px, rgb(0, 0, 0) 0px 0px 2px"},
							)}/>
						{/*<NodeUI_Inner ref="innerBox" {...{map, node: nodeWithFinalType, nodeView, path, width}} widthOverride={widthOverride}/>*/}
						{/*showBelowMessage &&
							<Div ct style={{
								//whiteSpace: "normal", position: "absolute", left: 0, right: 0, top: "100%", fontSize: 12
								marginTop: 5, fontSize: 12,
								width: 0, // fixes that link-lines would have gap on left
							}}>
								Needs 2 premises to be visible.
							</Div>*/}
					</div>
					{!limitBar_above && children}
				</div>

				{nodeChildren == emptyArray_forLoading &&
					<div style={{margin: "auto 0 auto 10px"}}>...</div>}
				{IsRootNode(node) && nodeChildren != emptyArray_forLoading && nodeChildren.length == 0 &&
					<div style={{margin: "auto 0 auto 10px", background: "rgba(0,0,0,.7)", padding: 5, borderRadius: 5}}>To add a node, right click on the root node.</div>}
				{nodeChildren != emptyArray && !expanded && nodeChildren.length != 0 &&
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
						{nodeChildren.length}
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
				{expanded &&
					<div ref="childHolder" className="childHolder clickThrough" style={E(
						{
							//display: expanded ? "flex" : "none",
							flexDirection: "column", marginLeft: childPacks.length ? 30 : 0,
							//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
						},
						//!expanded && {visibility: "hidden", height: 0}, // maybe temp; fix for lines-sticking-to-top issue
					)}>
						{svgInfo.mainBoxOffset &&
							<NodeConnectorBackground node={node} mainBoxOffset={svgInfo.mainBoxOffset} shouldUpdate={this.lastRender_source == RenderSource.SetState}
								childNodes={nodeChildren} childBoxOffsets={svgInfo.oldChildBoxOffsets}/>}
						
						{!separateChildren && childPacks.slice(0, childLimit_down).map((pack, index)=> {
							return (
								<NodeUI key={pack.node._id} ref={c=>this.childBoxes[pack.node._id] = GetInnerComp(c)} map={map} node={pack.node}
										path={path + "/" + pack.node._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}>
									{index == childLimit_down - 1 && (childPacks.length > childLimit_down || childLimit_down != initialChildLimit) &&
										<ChildLimitBar {...{map, path, childrenWidthOverride, childLimit: childLimit_down}}
											direction="down" childCount={childPacks.length}/>}
								</NodeUI>
							);
						})}
						{separateChildren &&
							<Column ref="upChildHolder" ct className="upChildHolder">
								{upChildPacks.slice(-childLimit_up).map((pack, index)=> {
									return (
										<NodeUI key={pack.node._id} ref={c=>this.childBoxes[pack.node._id] = GetInnerComp(c)} map={map} node={pack.node}
												path={path + "/" + pack.node._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}>
											{index == 0 && !showAll && (upChildPacks.length > childLimit_up || childLimit_up != initialChildLimit) &&
												<ChildLimitBar {...{map, path, childrenWidthOverride, childLimit: childLimit_up}}
													direction="up" childCount={upChildPacks.length}/>}
										</NodeUI>
									);
								})}
							</Column>}
						{separateChildren &&
							<Column ref="downChildHolder" ct>
								{downChildPacks.slice(0, childLimit_down).map((pack, index)=> {
									return (
										<NodeUI key={pack.node._id} ref={c=>this.childBoxes[pack.node._id] = GetInnerComp(c)} map={map} node={pack.node}
												path={path + "/" + pack.node._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}>
											{index == childLimit_down - 1 && !showAll && (downChildPacks.length > childLimit_down || childLimit_down != initialChildLimit) &&
												<ChildLimitBar {...{map, path, childrenWidthOverride, childLimit: childLimit_down}}
													direction="down" childCount={downChildPacks.length}/>}
										</NodeUI>
									);
								})}
							</Column>}
					</div>}
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
							path={`${path}/L${subnode._id}`} widthOverride={widthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}/>
					);
				})}
			</div>
		);
	}
	childBoxes: {[key: number]: NodeUI} = {};

	//GetMeasurementInfo(/*props: Props, state: State*/) {
	measurementInfo_cache;
	measurementInfo_cache_lastUsedProps;
	/*ComponentWillReceiveProps(newProps) {
		this.GetMeasurementInfo(newProps, false); // refresh measurement-info when props change
	}*/
	//GetMeasurementInfo(useCached: boolean) {
	GetMeasurementInfo() {
		let props_used = this.props.Including("node", "path", "subnodes") as any;
		//Log("Checking whether should remeasure info for: " + props_used.node._id);
		if (this.measurementInfo_cache && ShallowEquals(this.measurementInfo_cache_lastUsedProps, props_used)) return this.measurementInfo_cache;

		let {node, path, subnodes} = props_used as Props;
		let {expectedBoxWidth, width, expectedHeight} = GetMeasurementInfoForNode(node, path);

		for (let subnode of subnodes) {
			let subnodeMeasurementInfo = GetMeasurementInfoForNode(subnode, ""+subnode._id);
			expectedBoxWidth = Math.max(expectedBoxWidth, subnodeMeasurementInfo.expectedBoxWidth);
		}

		this.measurementInfo_cache = {expectedBoxWidth, width, expectedHeight};
		this.measurementInfo_cache_lastUsedProps = props_used;
		return this.measurementInfo_cache;
	}

	lastHeight = 0;
	lastPos = 0;
	PostRender() {
		//if (this.lastRender_source == RenderSource.SetState) return;

		let height = $(FindDOM(this)).outerHeight();
		let pos = this.state.childrenCenterY|0;
		if (height != this.lastHeight) {
			this.OnHeightChange();
		} else if (pos != this.lastPos) {
			this.OnPosChange();
		} else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateState();
		}
		this.lastHeight = height;
		this.lastPos = pos;
	}
	ComponentDidMount() {
		let {node, userViewedNodes} = this.props;
		if (GetUserID() == null) return;

		let userViewedNodes_doneLoading = userViewedNodes !== undefined;
		if (userViewedNodes_doneLoading && !(userViewedNodes || {}).VKeys(true).map(ToInt).Contains(node._id)) {
			new NotifyNodeViewed({nodeID: node._id}).Run();
		}
	}
	OnChildHeightOrPosChange_updateStateQueued = false;
	OnChildHeightOrPosChange() {
		let {node} = this.props;
		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
			()=>`OnChildHeightOrPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}\ncenterY:${this.state.childrenCenterY}`)

		//this.OnHeightOrPosChange();
		// wait one frame, so that if multiple calls to this method occur in the same frame, we only have to call OnHeightOrPosChange() once
		if (!this.OnChildHeightOrPosChange_updateStateQueued) {
			this.OnChildHeightOrPosChange_updateStateQueued = true;
			requestAnimationFrame(()=> {
				if (!this.mounted) return;
				this.UpdateState();
				this.OnChildHeightOrPosChange_updateStateQueued = false;
			});
		}
	}

	OnHeightChange() {
		let {node, onHeightOrPosChange} = this.props;
		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
			()=>`OnHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
				}centerY:${this.state.childrenCenterY}`);
		
		//this.UpdateState(true);
		this.UpdateState();
		if (onHeightOrPosChange) onHeightOrPosChange();
	}
	OnPosChange() {
		let {node, onHeightOrPosChange} = this.props;
		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
			()=>`OnPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
				}centerY:${this.state.childrenCenterY}`);

		if (onHeightOrPosChange) onHeightOrPosChange();
	}
	UpdateState(forceUpdate = false) {
		let {map, node, path, children, subnodes, nodeView} = this.props;
		let expanded = nodeView && nodeView.expanded;
		//let {childHolder, upChildHolder} = this.refs;
		let childHolder = $(this.nodeUI).children(".childHolder");
		let upChildHolder = childHolder.children(".upChildHolder");
		let downChildHolder = childHolder.children(".downChildHolder");
		/*let firstChild = (upChildHolder.length ? upChildHolder : childHolder).children().ToList()[0];
		let lastChild = (downChildHolder.length ? downChildHolder : childHolder).children().ToList().Last();*/

		// if children are supposed to show, but are not rendered yet, do not call set-state (yet)
		/*if (expanded) {
			if (upChildHolder.length) {
				if (upChildHolder.css("display") == "none") return;
			} else {
				if (childHolder.css("display") == "none") return;
			}
		}*/

		let childBoxes = this.childBoxes.VValues().filter(a=>a != null);
		let newState = E(
			expanded &&
				{childrenWidthOverride: childBoxes.map(comp=>comp.GetMeasurementInfo().width).concat(0).Max(null, true)},
			/*{childrenCenterY: upChildHolder
				? (upChildHolder && upChildHolder.style.display != "none" ? upChildHolder.clientHeight : 0)
				: (childHolder && childHolder.style.display != "none" ? childHolder.clientHeight / 2 : 0)}*/
			expanded && {childrenCenterY: upChildHolder.length
				//? (upChildHolder.css("display") != "none" ? upChildHolder.outerHeight() : 0)
				? (upChildHolder.css("visibility") != "hidden" ? upChildHolder.outerHeight() : 0)
				//: (childHolder.css("display") != "none" ? childHolder.outerHeight() / 2 : 0)},
				: (childHolder.css("visibility") != "hidden" ? childHolder.outerHeight() / 2 : 0)},
			/*{childrenStartY: upChildHolder.length
				? (upChildHolder.css("display") != "none" ? firstChild.GetScreenRect().y -  : 0)
				: (childHolder.css("display") != "none" ? childHolder.outerHeight() / 2 : 0)}*/
		) as State;

		//let {width, expectedHeight} = this.GetMeasurementInfo(this.props, E(this.state, newState) as State);
		let {expectedBoxWidth, expectedHeight} = this.GetMeasurementInfo();

		let innerBoxOffset = ((newState.childrenCenterY|0) - (expectedHeight / 2)).KeepAtLeast(0);
		//if (this.lastRender_source == RenderSource.SetState && this.refs.childHolder) {
		//if (this.refs.childHolder) {
		if (expanded && this.refs.childHolder) {
			let holderOffset = new Vector2i($(FindDOM(this.refs.childHolder)).offset());
			let innerBox = $(FindDOM(this.refs.innerBox));
			//var mainBoxOffset = new Vector2i(innerBox.offset()).Minus(holderOffset);
			let mainBoxOffset = new Vector2i(0, innerBoxOffset);
			//mainBoxOffset = mainBoxOffset.Plus(new Vector2i(innerBox.width(), innerBox.outerHeight() / 2));
			mainBoxOffset = mainBoxOffset.Plus(new Vector2i(-30, innerBox.outerHeight() / 2));

			let showLimitBar = !!children; // the only type of child we ever pass into NodeUI is a LimitBar
			let limitBar_above = node.finalPolarity == Polarity.Supporting;
			//if (IsReversedArgumentNode(node)) limitBar_above = !limitBar_above;
			if (showLimitBar && limitBar_above) mainBoxOffset.y += ChildLimitBar.HEIGHT;

			let oldChildBoxOffsets = this.childBoxes.Props().Where(pair=>pair.value != null).ToMap(pair=>pair.name, pair=> {
				//let childBox = FindDOM_(pair.value).find("> div:first-child > div"); // get inner-box of child
				let childBox = $(FindDOM(pair.value)).find(".NodeUI_Inner").first(); // get inner-box of child
				let childBoxOffset = new Vector2i(childBox.offset()).Minus(holderOffset);
				childBoxOffset = childBoxOffset.Plus(new Vector2i(0, childBox.outerHeight() / 2));
				return childBoxOffset;
			});
			newState.svgInfo = {mainBoxOffset, oldChildBoxOffsets};
		}
		
		let cancelIfStateSame = !forceUpdate && subnodes.length == 0;
		var changedState = this.SetState(newState, null, cancelIfStateSame, true);
		//Log(`Changed state? (${this.props.node._id}): ` + changedState);
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

@Connect((state, props)=> ({
	initialChildLimit: State(a=>a.main.initialChildLimit),
}))
class ChildLimitBar extends BaseComponent
		<{map: Map, path: string, childrenWidthOverride: number, direction: "up" | "down", childCount: number, childLimit: number}
			& Partial<{initialChildLimit: number}>,
		{}> {
	static HEIGHT = 36;
	render() {
		let {map, path, childrenWidthOverride, direction, childCount, childLimit, initialChildLimit} = this.props;
		return (
			<Row style={{
				//position: "absolute", marginTop: -30,
				[direction == "up" ? "marginBottom" : "marginTop"]: 10, width: childrenWidthOverride, cursor: "default",
			}}>
				<Button text={
					<Row>
						<Icon icon={`arrow-${direction}`} size={15}/>
						<Div ml={3}>{childCount > childLimit ? childCount - childLimit : null}</Div>
					</Row>
				} title="Show more"
				enabled={childLimit < childCount} style={{flex: 1}} onClick={()=> {
					store.dispatch(new ACTMapNodeChildLimitSet({mapID: map._id, path, direction, value: (childLimit + 3).KeepAtMost(childCount)}));
				}}/>
				<Button ml={5} text={
					<Row>
						<Icon icon={`arrow-${direction == "up" ? "down" : "up"}`} size={15}/>
						{/*<Div ml={3}>{childCount > childLimit ? childCount - childLimit : null}</Div>*/}
					</Row>
				} title="Show less"
				enabled={childLimit > initialChildLimit} style={{flex: 1}} onClick={()=> {
					store.dispatch(new ACTMapNodeChildLimitSet({mapID: map._id, path, direction, value: (childLimit - 3).KeepAtLeast(initialChildLimit)}));
				}}/>
			</Row>
		);
	}
}

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