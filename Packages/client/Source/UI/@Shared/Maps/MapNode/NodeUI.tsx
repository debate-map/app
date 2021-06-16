import {Assert, CachedTransform, E, emptyArray, emptyArray_forLoading, IsNaN, nl, AssertWarn} from "web-vcore/nm/js-vextensions";
import React from "react";
import {Column, Row} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus, GetInnerComp, RenderSource, ShallowEquals, UseCallback, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions";
import {NodeChildHolder} from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolder";
import {NodeChildHolderBox} from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolderBox";
import {EB_ShowError, EB_StoreError, MaybeLog, ShouldLog, Observer} from "vwebapp-framework";
import {logTypes} from "Utils/General/Logging";
import {GetTimeFromWhichToShowChangedNodes, GetPlayingTimeline, GetPlayingTimelineStepIndex, GetPlayingTimelineRevealNodes_UpToAppliedStep} from "Store/main/maps/mapStates/$mapState";
import {SlicePath} from "web-vcore/nm/mobx-graphlink";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView";
import {Map, MapNodeL3, Polarity, AccessLevel, IsNodeL2, IsNodeL3, IsSinglePremiseArgument, IsPremiseOfSinglePremiseArgument, IsMultiPremiseArgument, GetNodeChildrenL3, GetParentNodeL3, GetParentPath, HolderType, IsRootNode, ChangeType, MapNodeType, GetSubnodesInEnabledLayersEnhanced, MeID} from "@debate-map/server-link/Source/Link";


import {GetNodeChildrenL3_Advanced} from "Store/firebase_ext/nodes";
import {GetPathsToChangedDescendantNodes_WithChangeTypes} from "Store/firebase_ext/mapNodeEditTimes";


import {ES} from "Utils/UI/GlobalStyles";
import {NodeUI_Menu_Stub} from "./NodeUI_Menu";
import {NodeUI_Inner} from "./NodeUI_Inner";
import {GetMeasurementInfoForNode} from "./NodeUI/NodeMeasurer";
import {NodeChildCountMarker} from "./NodeUI/NodeChildCountMarker";
import {NodeChangesMarker} from "./NodeUI/NodeChangesMarker";

// @ExpensiveComponent
@WarnOfTransientObjectProps
@Observer
export class NodeUI extends BaseComponentPlus(
	{} as {
		indexInNodeList: number, map: Map, node: MapNodeL3, path?: string, asSubnode?: boolean, widthOverride?: number, style?,
		onHeightOrPosChange?: ()=>void
	},
	{expectedBoxWidth: 0, expectedBoxHeight: 0, dividePoint: null as number, selfHeight: 0},
) {
	/* static renderCount = 0;
	static lastRenderTime = -1; */
	static ValidateProps(props) {
		const {node} = props;
		Assert(IsNodeL2(node), "Node supplied to NodeUI is not level-2!");
		Assert(IsNodeL3(node), "Node supplied to NodeUI is not level-3!");
	}
	static ValidateState(state) {
		const {dividePoint, selfHeight} = state;
		Assert(!IsNaN(dividePoint) && !IsNaN(selfHeight));
	}

	nodeUI: HTMLDivElement;
	innerUI: NodeUI_Inner;
	componentDidCatch(message, info) { EB_StoreError(this, message, info); }
	render() {
		if (this.state["error"]) return EB_ShowError(this.state["error"]);
		let {indexInNodeList, map, node, path, asSubnode, widthOverride, style, onHeightOrPosChange, children} = this.props;
		const {expectedBoxWidth, expectedBoxHeight, dividePoint, selfHeight} = this.state;

		performance.mark("NodeUI_1");
		path = path || node._key.toString();

		const nodeChildren = GetNodeChildrenL3(node._key, path);
		// let nodeChildrenToShow: MapNodeL3[] = nodeChildren.Any(a => a == null) ? emptyArray_forLoading : nodeChildren; // only pass nodeChildren when all are loaded
		const nodeChildrenToShow = GetNodeChildrenL3_Advanced(node._key, path, map._key, true, null, true, true, true);

		/* let subnodes = GetSubnodesInEnabledLayersEnhanced(MeID(), map, node._key);
		subnodes = subnodes.Any(a => a == null) ? emptyArray : subnodes; // only pass subnodes when all are loaded */

		const sinceTime = GetTimeFromWhichToShowChangedNodes(map._key);
		const pathsToChangedDescendantNodes_withChangeTypes = GetPathsToChangedDescendantNodes_WithChangeTypes(map._key, sinceTime, path);
		const addedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.Add).length;
		const editedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.Edit).length;

		const parent = GetParentNodeL3(path);
		const parentPath = GetParentPath(path);
		// const parentNodeView = GetNodeView(map._key, parentPath) || new MapNodeView();
		// const parentNodeView = Watch(() => GetNodeView(map._key, parentPath) || new MapNodeView(), [map._key, parentPath]);
		const parentNodeView = GetNodeView(map._key, parentPath);

		const isSinglePremiseArgument = IsSinglePremiseArgument(node);
		const isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);
		const isMultiPremiseArgument = IsMultiPremiseArgument(node);
		const argumentNode = node.type == MapNodeType.Argument ? node : isPremiseOfSinglePremiseArg ? parent : null;

		/* const initialChildLimit = State(a => a.main.initialChildLimit);
		const form = GetNodeForm(node, GetParentNodeL2(path)); */
		/* const nodeView_early = GetNodeView(map._key, path) || new MapNodeView();
		const nodeView = CachedTransform('nodeView_transform1', [map._key, path], nodeView_early.Excluding('focused', 'viewOffset', 'children'), () => nodeView_early); */
		// const nodeView = Watch(() => GetNodeView(map._key, path) || new MapNodeView(), [map._key, path]);
		const nodeView = GetNodeView(map._key, path);
		const boxExpanded = (isPremiseOfSinglePremiseArg ? parentNodeView?.expanded : nodeView?.expanded) ?? false;

		const playingTimeline = GetPlayingTimeline(map._key);
		const playingTimeline_currentStepIndex = GetPlayingTimelineStepIndex(map._key);
		// const playingTimelineShowableNodes = GetPlayingTimelineRevealNodes_All(map._key);
		// const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map._key, true);
		// if users scrolls to step X and expands this node, keep expanded even if user goes back to a previous step
		const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map._key);

		performance.mark("NodeUI_2");
		if (ShouldLog(a=>a.nodeRenders)) {
			if (logTypes.nodeRenders_for) {
				if (logTypes.nodeRenders_for == node._key) {
					Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node._key}`, "\nPropsChanged:", this.GetPropChanges(), "\nStateChanged:", this.GetStateChanges());
				}
			} else {
				Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node._key}`, "\nPropsChanged:", this.GetPropChanges().map(a=>a.key), "\nStateChanged:", this.GetStateChanges().map(a=>a.key));
			}
		}
		// NodeUI.renderCount++;
		// NodeUI.lastRenderTime = Date.now();

		// if single-premise arg, combine arg and premise into one box, by rendering premise box directly (it will add-in this argument's child relevance-arguments)
		if (isSinglePremiseArgument) {
			const premises = nodeChildren.filter(a=>a && a.type == MapNodeType.Claim);
			if (premises.length) {
				AssertWarn(premises.length == 1, `Single-premise argument #${node._key} has more than one premise! (${premises.map(a=>a._key).join(",")})`);
				const premise = premises[0];

				// if has child-limit bar, correct its path
				const firstChildComp = this.FlattenedChildren[0] as any;
				if (firstChildComp && firstChildComp.props.path == path) {
					firstChildComp.props.path = `${firstChildComp.props.path}/${premise._key}`;
				}

				return (
					<NodeUI ref={c=>this.proxyDisplayedNodeUI = c} {...this.props} key={premise._key} map={map} node={premise} path={`${path}/${premise._key}`}>
						{children}
					</NodeUI>
				);
			}

			// if there are not-yet-loaded children that *might* be the premise, wait for them to finish loading before showing the "no premise" message
			if (nodeChildren.Any(a=>a == null)) {
				//return <div title={`Loading premise "${node.children.VKeys()[0]}"...`}>...</div>;
				return <div/>;
			}

			// placeholder, so user can add the base-claim
			// const backgroundColor = GetNodeColor(node).desaturate(0.5).alpha(0.8);
			return (
				<Column>
					<Row /* mt={indexInNodeList === 0 ? 0 : 5} */ className="cursorSet"
						style={{
							padding: 5, borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)",
							background: /* backgroundColor.css() */ "rgba(0, 0, 0, 0.7)",
							margin: "5px 0", // emulate usual internal NodeUI
							fontSize: 14, // emulate usual internal NodeUI_Inner
						}}
					>
						<span style={{opacity: 0.5}}>(single-premise arg lacks base-claim; right-click to add)</span>
						{/* <NodeUI_Menu_Helper {...{map, node}}/> */}
						<NodeUI_Menu_Stub {...{map, node, path}}/>
					</Row>
				</Column>
			);
		}

		const separateChildren = node.type == MapNodeType.Claim;

		const parentChildren = GetNodeChildrenL3(parent?._key, parentPath);
		if (isPremiseOfSinglePremiseArg) {
			const argument = parent;
			const argumentPath = SlicePath(path, 1);
			var relevanceArguments = parentChildren.filter(a=>a && a.type == MapNodeType.Argument);
			// Assert(!relevanceArguments.Any(a=>a.type == MapNodeType.Claim), "Single-premise argument has more than one premise!");
			if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
				// relevanceArguments = relevanceArguments.filter(child => playingTimelineVisibleNodes.Contains(`${argumentPath}/${child._key}`));
				// if this node (or a descendent) is marked to be revealed by a currently-applied timeline-step, reveal this node
				relevanceArguments = relevanceArguments.filter(child=>playingTimelineVisibleNodes.Any(a=>a.startsWith(`${argumentPath}/${child._key}`)));
			}
		}

		const {width, expectedHeight} = this.GetMeasurementInfo();

		const showLimitBar = !!children; // the only type of child we ever pass into NodeUI is a LimitBar
		const limitBar_above = argumentNode && argumentNode.displayPolarity == Polarity.Supporting;
		const limitBarPos = showLimitBar ? (limitBar_above ? LimitBarPos.Above : LimitBarPos.Below) : LimitBarPos.None;

		let nodeChildHolder_direct: JSX.Element;
		if (!isPremiseOfSinglePremiseArg && boxExpanded) {
			const showArgumentsControlBar = (node.type == MapNodeType.Claim || isSinglePremiseArgument) && boxExpanded && nodeChildrenToShow != emptyArray_forLoading;
			nodeChildHolder_direct = <NodeChildHolder {...{map, node, path, nodeChildren, nodeChildrenToShow, separateChildren, showArgumentsControlBar}}
				// type={node.type == MapNodeType.Claim && node._id != demoRootNodeID ? HolderType.Truth : null}
				type={null}
				linkSpawnPoint={dividePoint || (selfHeight / 2)}
				vertical={isMultiPremiseArgument}
				minWidth={isMultiPremiseArgument && widthOverride ? widthOverride - 20 : 0}
				onHeightOrDividePointChange={UseCallback(dividePoint=>{
					// if multi-premise argument, divide-point is always at the top (just far enough down that the self-ui can center to the point, so self-height / 2)
					if (isMultiPremiseArgument) {
						// this.SetState({dividePoint: selfHeight / 2});
						return;
					}
					this.SetState({dividePoint});
				}, [isMultiPremiseArgument])}/>;
		}
		const nodeChildHolderBox_truth = isPremiseOfSinglePremiseArg && boxExpanded &&
			<NodeChildHolderBox {...{map, node, path}} type={HolderType.Truth}
				widthOfNode={widthOverride || width}
				nodeChildren={nodeChildren} nodeChildrenToShow={nodeChildrenToShow}
				onHeightOrDividePointChange={UseCallback(dividePoint=>this.CheckForChanges(), [])}/>;
		const nodeChildHolderBox_relevance = isPremiseOfSinglePremiseArg && boxExpanded &&
			<NodeChildHolderBox {...{map, node: parent, path: parentPath}} type={HolderType.Relevance}
				widthOfNode={widthOverride || width}
				nodeChildren={GetNodeChildrenL3(parent._key, parentPath)} nodeChildrenToShow={relevanceArguments}
				onHeightOrDividePointChange={UseCallback(dividePoint=>this.CheckForChanges(), [])}/>;

		// const hasExtraWrapper = subnodes.length || isMultiPremiseArgument;

		performance.mark("NodeUI_3");
		performance.measure("NodeUI_Part1", "NodeUI_1", "NodeUI_2");
		performance.measure("NodeUI_Part2", "NodeUI_2", "NodeUI_3");
		this.Stash({nodeChildrenToShow}); // for debugging

		// useEffect(() => CheckForChanges());

		/* return (
			<>
				{...}
				{hasExtraWrapper && <>
					{subnodes.map((subnode, index) => (
						<NodeUI key={index} indexInNodeList={index} map={map} node={subnode} asSubnode={true} style={E({ marginTop: -5 })}
							path={`${path}/L${subnode._key}`} widthOverride={widthOverride} onHeightOrPosChange={onHeightOrPosChange}/>
					))}
					<div className="clickThrough" style={E({ marginTop: -5 })}>
						{isMultiPremiseArgument
							&& nodeChildHolder_direct}
					</div>
					{!limitBar_above && children}
				</>}
			</>
		); */
		return (
			<div ref={c=>this.nodeUI = c} className="NodeUI clickThrough" style={E(
				{position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0},
				style,
			)}>
				<div className="innerBoxAndSuchHolder clickThrough" style={ES(
					{position: "relative"},
					/* useAutoOffset && {display: "flex", height: "100%", flexDirection: "column", justifyContent: "center"},
					!useAutoOffset && {paddingTop: innerBoxOffset}, */
					// {paddingTop: innerBoxOffset},
					{marginTop: boxExpanded && !isMultiPremiseArgument ? (dividePoint - (selfHeight / 2)).NaNTo(0).KeepAtLeast(0) : 0},
				)}>
					{limitBar_above && children}
					{asSubnode &&
					<div style={{position: "absolute", left: 2, right: 2, top: -3, height: 3, borderRadius: "3px 3px 0 0", background: "rgba(255,255,0,.7)"}}/>}
					<Column className="innerBoxHolder clickThrough" style={{position: "relative"}}>
						{node.current.accessLevel != AccessLevel.Basic &&
						<div style={{position: "absolute", right: "calc(100% + 5px)", top: 0, bottom: 0, display: "flex", fontSize: 10}}>
							<span style={{margin: "auto 0"}}>{AccessLevel[node.current.accessLevel][0].toUpperCase()}</span>
						</div>}
						{nodeChildHolderBox_truth}
						<NodeUI_Inner ref={c=>this.innerUI = GetInnerComp(c)} {...{indexInNodeList, map, node, path, width, widthOverride}}/>
						{nodeChildHolderBox_relevance}
						{isMultiPremiseArgument &&
							nodeChildHolder_direct}
					</Column>
					{!limitBar_above && children}
				</div>

				{nodeChildrenToShow == emptyArray_forLoading &&
					<div style={{margin: "auto 0 auto 10px"}}>...</div>}
				{IsRootNode(node) && nodeChildrenToShow != emptyArray_forLoading && nodeChildrenToShow.length == 0 && playingTimeline == null &&
					<div style={{margin: "auto 0 auto 10px", background: "rgba(0,0,0,.7)", padding: 5, borderRadius: 5}}>To add a node, right click on the root node.</div>}
				{!boxExpanded &&
					<NodeChildCountMarker {...{limitBarPos}} childCount={nodeChildrenToShow.length + (relevanceArguments ? relevanceArguments.length : 0)}/>}
				{!boxExpanded && (addedDescendants > 0 || editedDescendants > 0) &&
					<NodeChangesMarker {...{addedDescendants, editedDescendants, limitBarPos}}/>}
				{!isMultiPremiseArgument &&
					nodeChildHolder_direct}
			</div>
		);
	}
	proxyDisplayedNodeUI: NodeUI;
	get NodeUIForDisplayedNode() {
		return this.proxyDisplayedNodeUI || this;
	}

	PostRender() {
		this.CheckForChanges();
	}

	// don't actually check for changes until re-rendering has stopped for 500ms
	// CheckForChanges = _.debounce(() => {
	CheckForChanges = ()=>{
		const {node, onHeightOrPosChange, dividePoint} = this.PropsState;

		// if (this.lastRender_source == RenderSource.SetState) return;

		// see UseSize_Method for difference between offsetHeight and the alternatives
		const height = this.DOM_HTML.offsetHeight;
		if (height != this.lastHeight) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._key),
				()=>`OnHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._key}${nl}NewHeight:${height}`);

			// this.UpdateState(true);
			// this.UpdateState();
			if (onHeightOrPosChange) onHeightOrPosChange();
		}
		this.lastHeight = height;

		const selfHeight = this.SafeGet(a=>a.innerUI.DOM_HTML.offsetHeight, 0);
		if (selfHeight != this.lastSelfHeight) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._key),
				()=>`OnSelfHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._key}${nl}NewSelfHeight:${selfHeight}`);

			// this.UpdateState(true);
			// this.UpdateState();
			// setSelfHeight(selfHeight);
			this.SetState({selfHeight});
			// if (onHeightOrPosChange) onHeightOrPosChange();
		}
		this.lastSelfHeight = selfHeight;

		if (dividePoint != this.lastDividePoint) {
			if (onHeightOrPosChange) onHeightOrPosChange();
		}

		/* else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateState();
			this.ReportChildrenCenterYChange();
		} */
	};

	/* ComponentDidMount() {
		const { node, userViewedNodes } = this.props;
		if (MeID() == null) return;

		const userViewedNodes_doneLoading = userViewedNodes !== undefined;
		if (userViewedNodes_doneLoading && !(userViewedNodes || {}).VKeys().Contains(node._key)) {
			new NotifyNodeViewed({ nodeID: node._key }).Run();
		}
	} */

	lastHeight = 0;
	lastSelfHeight = 0;
	lastDividePoint = 0;

	// GetMeasurementInfo(/*props: Props, state: State*/) {
	measurementInfo_cache;
	measurementInfo_cache_lastUsedProps;
	/* ComponentWillReceiveProps(newProps) {
		this.GetMeasurementInfo(newProps, false); // refresh measurement-info when props change
	} */
	// GetMeasurementInfo(useCached: boolean) {
	GetMeasurementInfo() {
		if (this.proxyDisplayedNodeUI) return this.proxyDisplayedNodeUI.GetMeasurementInfo();

		const {props} = this;
		const props_used = this.props.Including("map", "node", "path") as typeof props;
		// Log("Checking whether should remeasure info for: " + props_used.node._id);
		if (this.measurementInfo_cache && ShallowEquals(this.measurementInfo_cache_lastUsedProps, props_used)) return this.measurementInfo_cache;

		const {map, node, path} = props_used;
		const subnodes = GetSubnodesInEnabledLayersEnhanced(MeID(), map._key, node._key);
		let {expectedBoxWidth, width, expectedHeight} = GetMeasurementInfoForNode(node, path);

		for (const subnode of subnodes) {
			const subnodeMeasurementInfo = GetMeasurementInfoForNode(subnode, `${subnode._key}`);
			expectedBoxWidth = Math.max(expectedBoxWidth, subnodeMeasurementInfo.expectedBoxWidth);
		}

		const isMultiPremiseArgument = IsMultiPremiseArgument(node);
		if (isMultiPremiseArgument) {
			// expectedBoxWidth = expectedBoxWidth.KeepAtLeast(350);
			width = width.KeepAtLeast(350);
			// expectedBoxWidth += 20;
			width += 20; // give extra space for left-margin
		}

		this.measurementInfo_cache = {expectedBoxWidth, width/* , expectedHeight */};
		this.measurementInfo_cache_lastUsedProps = props_used;
		return this.measurementInfo_cache;
	}
}

export enum LimitBarPos {
	Above,
	Below,
	None,
}