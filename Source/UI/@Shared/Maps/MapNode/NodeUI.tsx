import {ChangeType} from "Store/firebase/mapNodeEditTimes";
import {GetNode, HolderType} from "Store/firebase/nodes";
import {GetUserID} from "Store/firebase/users";
import {GetPlayingTimelineAppliedStepRevealNodes} from "Store/main/maps/$map";
import {NodeChildHolder} from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolder";
import {NodeChildHolderBox} from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolderBox";
import {CachedTransform, E, Timer} from "js-vextensions";
import {Column} from "react-vcomponents";
import {BaseComponentWithConnector, GetInnerComp, RenderSource, ShallowChanged, ShallowEquals} from "react-vextensions";
import {SlicePath} from "../../../../Frame/Database/DatabaseHelpers";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {Log} from "../../../../Frame/General/Logging";
import {emptyArray, emptyArray_forLoading} from "../../../../Frame/Store/ReducerUtils";
import NotifyNodeViewed from "../../../../Server/Commands/NotifyNodeViewed";
import {GetSubnodesInEnabledLayersEnhanced} from "../../../../Store/firebase/layers";
import {GetNodeChangeType, GetPathsToNodesChangedSinceX} from "../../../../Store/firebase/mapNodeEditTimes";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {GetNodeChildrenL3, GetNodeID, GetParentNodeL2, GetParentNodeL3, IsRootNode} from "../../../../Store/firebase/nodes";
import {GetNodeForm, IsMultiPremiseArgument, IsNodeL2, IsNodeL3, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument} from "../../../../Store/firebase/nodes/$node";
import {AccessLevel, MapNodeL3, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {GetUserViewedNodes} from "../../../../Store/firebase/userViewedNodes";
import {GetNodeView} from "../../../../Store/main/mapViews";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {GetPlayingTimeline, GetPlayingTimelineCurrentStepRevealNodes, GetPlayingTimelineRevealNodes, GetPlayingTimelineStepIndex, GetTimeFromWhichToShowChangedNodes} from "../../../../Store/main/maps/$map";
import {NodeChangesMarker} from "./NodeUI/NodeChangesMarker";
import {NodeChildCountMarker} from "./NodeUI/NodeChildCountMarker";
import {GetMeasurementInfoForNode} from "./NodeUI/NodeMeasurer";
import {NodeUI_Inner} from "./NodeUI_Inner";

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
	let nodeChildrenToShow = nodeChildren.Any(a=>a == null) ? emptyArray_forLoading : nodeChildren; // only pass nodeChildren when all are loaded
	//nodeChildren = nodeChildren.filter(a=>a);
	/*let nodeChildren_finalTypes = nodeChildren == emptyArray ? emptyArray : nodeChildren.map(child=> {
		return GetFinalNodeTypeAtPath(child, path + "/" + child._id);
	});*/

	let subnodes = GetSubnodesInEnabledLayersEnhanced(GetUserID(), map, node._id);
	subnodes = subnodes.Any(a=>a == null) ? emptyArray : subnodes; // only pass subnodes when all are loaded

	let sinceTime = GetTimeFromWhichToShowChangedNodes(map._id);
	let pathsToChangedNodes = GetPathsToNodesChangedSinceX(map._id, sinceTime);
	let pathsToChangedDescendantNodes = pathsToChangedNodes.filter(a=>a.startsWith(path + "/"));
	let changeTypesOfChangedDescendantNodes = pathsToChangedDescendantNodes.map(path=>GetNodeChangeType(GetNode(GetNodeID(path)), sinceTime));
	let addedDescendants = changeTypesOfChangedDescendantNodes.filter(a=>a == ChangeType.Add).length;
	let editedDescendants = changeTypesOfChangedDescendantNodes.filter(a=>a == ChangeType.Edit).length;

	let parentNodeView = (GetParentNodeL3(path) && GetNodeView(map._id, SlicePath(path, 1))) || new MapNodeView();

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
		nodeChildrenToShow,
		subnodes,
		parentNodeView,

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
export class NodeUI extends BaseComponentWithConnector(connector, {expectedBoxWidth: 0, expectedBoxHeight: 0, dividePoint: null as number, selfHeight: 0}) {
	static renderCount = 0;
	static lastRenderTime = -1;
	static ValidateProps(props) {
		let {node} = props;
		Assert(IsNodeL2(node), "Node supplied to NodeUI is not level-2!");
		Assert(IsNodeL3(node), "Node supplied to NodeUI is not level-3!");
	}
	static ValidateState(state) {
		let {dividePoint, selfHeight} = state;
		Assert(!IsNaN(dividePoint) && !IsNaN(selfHeight));
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
			initialChildLimit, form, children, nodeView, parentNodeView, nodeChildren, nodeChildrenToShow, subnodes,
			playingTimeline, playingTimeline_currentStepIndex, playingTimelineShowableNodes, playingTimelineVisibleNodes, playingTimeline_currentStepRevealNodes,
			addedDescendants, editedDescendants} = this.props;
		let {dividePoint, selfHeight} = this.state;
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

		// if the premise of a single-premise argument
		let parent = GetParentNodeL3(path);
		let parentPath = SlicePath(path, 1);
		let isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);
		if (isPremiseOfSinglePremiseArg) {
			var relevanceArguments = GetNodeChildrenL3(parent, SlicePath(path, 1)).filter(a=>a && a.type == MapNodeType.Argument);
			//Assert(!relevanceArguments.Any(a=>a.type == MapNodeType.Claim), "Single-premise argument has more than one premise!");
		}

		let isSinglePremiseArgument = IsSinglePremiseArgument(node);
		let isMultiPremiseArgument = IsMultiPremiseArgument(node);
		let showArgumentsControlBar = (node.type == MapNodeType.Claim || isSinglePremiseArgument) && nodeView.expanded && nodeChildrenToShow != emptyArray_forLoading;

		let {width, expectedHeight} = this.GetMeasurementInfo();
		/*let innerBoxOffset = this.GetInnerBoxOffset(expectedHeight, showAddArgumentButtons, childrenCenterY);
		if (!expanded) innerBoxOffset = 0;*/

		let showLimitBar = !!children; // the only type of child we ever pass into NodeUI is a LimitBar
		let argumentNode = node.type == MapNodeType.Argument ? node : isPremiseOfSinglePremiseArg ? parent : null;
		let limitBar_above = argumentNode && argumentNode.finalPolarity == Polarity.Supporting;
		let limitBarPos = showLimitBar ? (limitBar_above ? LimitBarPos.Above : LimitBarPos.Below) : LimitBarPos.None;
		//if (IsReversedArgumentNode(node)) limitBar_above = !limitBar_above;
		/*let minChildCount = GetMinChildCountToBeVisibleToNonModNonCreators(node, nodeChildren);
		let showBelowMessage = nodeChildren.length > 0 && nodeChildren.length < minChildCount;*/

		// maybe temp
		let combineWithChildClaim = IsSinglePremiseArgument(node);
		let premises = nodeChildrenToShow.filter(a=>a.type == MapNodeType.Claim);
		if (combineWithChildClaim && premises.length == 1) {
			//Assert(premises.length == 1, `Single-premise argument #${node._id} has more than one premise! (${premises.map(a=>a._id).join(",")})`);

			let childLimit_up = ((nodeView || {}).childLimit_up || initialChildLimit).KeepAtLeast(initialChildLimit);
			let childLimit_down = ((nodeView || {}).childLimit_down || initialChildLimit).KeepAtLeast(initialChildLimit);
			let showAll = node._id == map.rootNode || node.type == MapNodeType.Argument;
			//return <ChildPackUI {...{map, path, childrenWidthOverride, childLimit_up, childLimit_down, showAll}} pack={pack} index={0} collection={childPacks}/>;*#/

			let index = 0;
			let direction = "down" as any;
			let premise = premises[0];
			//if (child == null) return <div/>; // child data not loaded yet
			//let collection = nodeChildren;
			let childLimit = direction == "down" ? childLimit_down : childLimit_up;

			// if has child-limit bar, correct its path
			let firstChildComp = this.FlattenedChildren[0] as any;
			if (firstChildComp && firstChildComp.props.path == path) {
				firstChildComp.props.path = firstChildComp.props.path + "/" + premise._id;
			}

			return (
				<NodeUI ref={c=>this.proxyDisplayedNodeUI = GetInnerComp(c)} {...this.props} key={premise._id} map={map} node={premise} path={path + "/" + premise._id}>
					{children}
				</NodeUI>
			);
		}

		let nodeChildHolder_direct = !isPremiseOfSinglePremiseArg && nodeView.expanded &&
			<NodeChildHolder {...{map, node, path, nodeView, nodeChildren, nodeChildrenToShow, separateChildren, showArgumentsControlBar}}
				//type={node.type == MapNodeType.Claim && node._id != demoRootNodeID ? HolderType.Truth : null}
				type={null}
				//linkSpawnPoint={innerBoxOffset + expectedHeight / 2}
				linkSpawnPoint={dividePoint || (selfHeight / 2)}
				vertical={isMultiPremiseArgument}
				minWidth={isMultiPremiseArgument && widthOverride ? widthOverride - 20 : 0}
				onHeightOrDividePointChange={dividePoint=> {
					// if multi-premise argument, divide-point is always at the top (just far enough down that the self-ui can center to the point, so self-height / 2)
					if (isMultiPremiseArgument) {
						//this.SetState({dividePoint: selfHeight / 2});
						return;
					}
					this.SetState({dividePoint});
				}}/>;
		let nodeChildHolderBox_truth = isPremiseOfSinglePremiseArg && nodeView.expanded &&
			<NodeChildHolderBox {...{map, node, path, nodeView}} type={HolderType.Truth}
				widthOfNode={widthOverride || width}
				nodeChildren={nodeChildren} nodeChildrenToShow={nodeChildrenToShow}
				onHeightOrDividePointChange={dividePoint=>this.CheckForChanges()}/>;
		let nodeChildHolderBox_relevance = isPremiseOfSinglePremiseArg && nodeView.expanded &&
			<NodeChildHolderBox {...{map, node: parent, path: parentPath, nodeView: parentNodeView}} type={HolderType.Relevance}
				widthOfNode={widthOverride || width}
				nodeChildren={GetNodeChildrenL3(parent, parentPath)} nodeChildrenToShow={relevanceArguments}
				onHeightOrDividePointChange={dividePoint=>this.CheckForChanges()}/>;

		let hasExtraWrapper = subnodes.length || isMultiPremiseArgument;

		let nodeUIResult_withoutSubnodes = (
			<div ref={c=>this.nodeUI = c} className="NodeUI clickThrough"
					style={E(
						{position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0},
						style,
					)}>
				<div ref="innerBoxAndSuchHolder" className="innerBoxAndSuchHolder clickThrough" style={E(
					{position: "relative"},
					/*useAutoOffset && {display: "flex", height: "100%", flexDirection: "column", justifyContent: "center"},
					!useAutoOffset && {paddingTop: innerBoxOffset},*/
					//{paddingTop: innerBoxOffset},
					{marginTop: nodeView.expanded && !isMultiPremiseArgument ? (dividePoint - (selfHeight / 2)).KeepAtLeast(0) : 0},
				)}>
					{limitBar_above && children}
					{asSubnode &&
						<div style={{position: "absolute", left: 2, right: 2, top: -3, height: 3, borderRadius: "3px 3px 0 0", background: "rgba(255,255,0,.7)"}}/>}
					<Column ref="innerBoxHolder" className="innerBoxHolder clickThrough" style={{position: "relative"}}>
						{node.current.accessLevel != AccessLevel.Basic &&
							<div style={{position: "absolute", right: "calc(100% + 5px)", top: 0, bottom: 0, display: "flex", fontSize: 10}}>
								<span style={{margin: "auto 0"}}>{AccessLevel[node.current.accessLevel][0].toUpperCase()}</span>
							</div>}
						{nodeChildHolderBox_truth}
						<NodeUI_Inner ref={c=>this.innerUI = GetInnerComp(c)} {...{map, node, nodeView, path, width, widthOverride}}
							style={E(
								playingTimeline_currentStepRevealNodes.Contains(path) && {boxShadow: "rgba(255,255,0,1) 0px 0px 7px, rgb(0, 0, 0) 0px 0px 2px"},
							)}/>
						{nodeChildHolderBox_relevance}
						{/*showBelowMessage &&
							<Div ct style={{
								//whiteSpace: "normal", position: "absolute", left: 0, right: 0, top: "100%", fontSize: 12
								marginTop: 5, fontSize: 12,
								width: 0, // fixes that link-lines would have gap on left
							}}>
								Needs 2 premises to be visible.
							</Div>*/}
					</Column>
					{!limitBar_above && !hasExtraWrapper && children}
				</div>

				{nodeChildrenToShow == emptyArray_forLoading &&
					<div style={{margin: "auto 0 auto 10px"}}>...</div>}
				{IsRootNode(node) && nodeChildrenToShow != emptyArray_forLoading && nodeChildrenToShow.length == 0 &&
					<div style={{margin: "auto 0 auto 10px", background: "rgba(0,0,0,.7)", padding: 5, borderRadius: 5}}>To add a node, right click on the root node.</div>}
				{!nodeView.expanded &&
					<NodeChildCountMarker {...{limitBarPos}} childCount={nodeChildrenToShow.length + (relevanceArguments ? relevanceArguments.length : 0)}/>}
				{!nodeView.expanded && (addedDescendants > 0 || editedDescendants > 0) &&
					<NodeChangesMarker {...{addedDescendants, editedDescendants, limitBarPos}}/>}
				{!isMultiPremiseArgument &&
					nodeChildHolder_direct}
			</div>
		);

		if (!hasExtraWrapper) {
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
				<div className="clickThrough" style={E({marginTop: -5})}>
					{isMultiPremiseArgument &&
						nodeChildHolder_direct}
				</div>
				{!limitBar_above && children}
			</div>
		);
	}
	proxyDisplayedNodeUI: NodeUI;
	get NodeUIForDisplayedNode() {
		return this.proxyDisplayedNodeUI || this;
	}

	ComponentDidMount() {
		let {node, userViewedNodes} = this.props;
		if (GetUserID() == null) return;

		let userViewedNodes_doneLoading = userViewedNodes !== undefined;
		if (userViewedNodes_doneLoading && !(userViewedNodes || {}).VKeys(true).map(ToInt).Contains(node._id)) {
			new NotifyNodeViewed({nodeID: node._id}).Run();
		}
	}

	PostRender() {
		this.CheckForChanges();
	}

	lastHeight = 0;
	lastSelfHeight = 0;
	lastDividePoint = 0;
	CheckForChanges() {
		//if (this.lastRender_source == RenderSource.SetState) return;
		let {node, onHeightOrPosChange} = this.props;
		let {dividePoint} = this.state;

		let height = $(GetDOM(this)).outerHeight();
		if (height != this.lastHeight) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
				()=>`OnHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
					}NewHeight:${height}`);
			
			//this.UpdateState(true);
			//this.UpdateState();
			if (onHeightOrPosChange) onHeightOrPosChange();
		}
		this.lastHeight = height;

		let selfHeight = $(GetDOM(this.innerUI)).outerHeight();
		if (selfHeight != this.lastSelfHeight) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
				()=>`OnSelfHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
					}NewSelfHeight:${selfHeight}`);
			
			//this.UpdateState(true);
			//this.UpdateState();
			this.SetState({selfHeight});
			//if (onHeightOrPosChange) onHeightOrPosChange();
		}
		this.lastSelfHeight = selfHeight;

		if (dividePoint != this.lastDividePoint) {
			if (onHeightOrPosChange) onHeightOrPosChange();
		}

		/*else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateState();
			this.ReportChildrenCenterYChange();
		}*/
	}

	//GetMeasurementInfo(/*props: Props, state: State*/) {
	measurementInfo_cache;
	measurementInfo_cache_lastUsedProps;
	/*ComponentWillReceiveProps(newProps) {
		this.GetMeasurementInfo(newProps, false); // refresh measurement-info when props change
	}*/
	//GetMeasurementInfo(useCached: boolean) {
	GetMeasurementInfo() {
		if (this.proxyDisplayedNodeUI) return this.proxyDisplayedNodeUI.GetMeasurementInfo();

		let props_used = this.props.Including("node", "path", "subnodes", "nodeChildren") as any;
		//Log("Checking whether should remeasure info for: " + props_used.node._id);
		if (this.measurementInfo_cache && ShallowEquals(this.measurementInfo_cache_lastUsedProps, props_used)) return this.measurementInfo_cache;

		let {node, path, subnodes, nodeChildren} = props_used as Props & {subnodes: MapNodeL3[], nodeChildren: MapNodeL3[]};
		let {expectedBoxWidth, width, expectedHeight} = GetMeasurementInfoForNode(node, path);

		for (let subnode of subnodes) {
			let subnodeMeasurementInfo = GetMeasurementInfoForNode(subnode, ""+subnode._id);
			expectedBoxWidth = Math.max(expectedBoxWidth, subnodeMeasurementInfo.expectedBoxWidth);
		}

		let isMultiPremiseArgument = IsMultiPremiseArgument(node);
		if (isMultiPremiseArgument) {
			//expectedBoxWidth = expectedBoxWidth.KeepAtLeast(350);
			width = width.KeepAtLeast(350);
			//expectedBoxWidth += 20;
			width += 20; // give extra space for left-margin
		}

		this.measurementInfo_cache = {expectedBoxWidth, width/*, expectedHeight*/};
		this.measurementInfo_cache_lastUsedProps = props_used;
		return this.measurementInfo_cache;
	}
}

export enum LimitBarPos {
	Above,
	Below,
	None,
}