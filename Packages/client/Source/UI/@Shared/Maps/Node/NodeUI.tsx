import {ChangeType, ChildGroup, GetChildLayout_Final, GetNodeChildrenL3, GetNodeDisplayText, GetNodeForm, GetParentNodeL3, GetParentPath, IsChildGroupValidForNode, IsNodeL2, IsNodeL3, IsRootNode, Map, NodeL3, NodeType, NodeType_Info} from "dm_common";
import React, {useCallback} from "react";
import {GetPathsToChangedDescendantNodes_WithChangeTypes} from "Store/db_ext/mapNodeEdits.js";
import {GetNodeChildrenL3_Advanced, GetNodeColor} from "Store/db_ext/nodes";
import {GetTimeFromWhichToShowChangedNodes} from "Store/main/maps/mapStates/$mapState.js";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {useRef_nodeLeftColumn} from "tree-grapher";
import {NodeChildHolder} from "UI/@Shared/Maps/Node/NodeUI/NodeChildHolder.js";
import {NodeChildHolderBox} from "UI/@Shared/Maps/Node/NodeUI/NodeChildHolderBox.js";
import {logTypes} from "Utils/General/Logging.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {EB_ShowError, EB_StoreError, MaybeLog, Observer, ShouldLog} from "web-vcore";
import {BailError} from "web-vcore/.yalc/mobx-graphlink";
import {Assert, ea, emptyArray, emptyArray_forLoading, IsNaN, nl, ShallowEquals} from "web-vcore/nm/js-vextensions.js";
import {Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, cssHelper, GetDOM, GetInnerComp, RenderSource, UseCallback, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {GUTTER_WIDTH, GUTTER_WIDTH_SMALL} from "./NodeLayoutConstants.js";
import {CloneHistoryButton} from "./NodeUI/CloneHistoryButton.js";
import {NodeChildCountMarker} from "./NodeUI/NodeChildCountMarker.js";
import {GetMeasurementInfoForNode} from "./NodeUI/NodeMeasurer.js";
import {NodeUI_Inner} from "./NodeUI_Inner.js";

// class holding values that are derived entirely within CheckForChanges()
class ObservedValues {
	constructor(data?: Partial<ObservedValues>) {
		Object.assign(this, data);
	}
	innerUIHeight = 0;
	childrensHeight = 0;
	height = 0;
}

// Warn if functions passed to NodeUI are transient (ie. change each render).
// We don't need to do this for every component, but we need at least one component-type in the tree to do so, in order to "stop propagation" of transient props.
// Thus, if the root node rerenders, we prevent the situation of the whole subtree rerendering.
// We choose the NodeUI component as this "barrier" to tree-wide rerendering. (so pay attention if console contains warnings about it!)
@WarnOfTransientObjectProps
@Observer
export class NodeUI extends BaseComponentPlus(
	{} as {
		indexInNodeList: number, map: Map, node: NodeL3, path: string, treePath: string, style?,
		inBelowGroup?: boolean,
		standardWidthInGroup?: number|n, // this is set by parent NodeChildHolder, once it determines the width that all children should use
		onHeightOrPosChange?: ()=>void
		ref_innerUI?: (c: NodeUI_Inner|n)=>any,
	},
	{
		//expectedBoxWidth: 0, expectedBoxHeight: 0,
		obs: new ObservedValues(),
	},
) {
	/* static renderCount = 0;
	static lastRenderTime = -1; */
	static ValidateProps(props) {
		const {node} = props;
		Assert(IsNodeL2(node), "Node supplied to NodeUI is not level-2!");
		Assert(IsNodeL3(node), "Node supplied to NodeUI is not level-3!");
	}
	static ValidateState(state) {
		const {childrenLineAnchorPoint, innerUIHeight} = state;
		Assert(!IsNaN(childrenLineAnchorPoint) && !IsNaN(innerUIHeight));
	}

	nodeUI: HTMLDivElement|n;
	innerUI: NodeUI_Inner|n;
	rightColumn: Column|n;
	childBoxes: {[key: string]: NodeChildHolderBox|n} = {};
	nodeChildHolder_generic: NodeChildHolder|n;
	componentDidCatch(message, info) {
		if (message instanceof BailError) return;
		EB_StoreError(this as any, message, info);
	}
	render() {
		if (this.state["error"]) return EB_ShowError(this.state["error"]);
		const {indexInNodeList, map, node, path, standardWidthInGroup, style, onHeightOrPosChange, ref_innerUI, treePath, inBelowGroup, children} = this.props;
		const {obs} = this.state;

		performance.mark("NodeUI_1");

		const GetNodeChildren = (node2: NodeL3|n, path2: string|n): NodeL3[]=>(node2 && path2 ? GetNodeChildrenL3(node2.id, path2) : ea);
		const GetNodeChildrenToShow = (node2: NodeL3|n, path2: string|n): NodeL3[]=>(node2 && path2 ? GetNodeChildrenL3_Advanced(node2.id, path2, map.id, true, undefined, true, true) : ea);

		const nodeChildren = GetNodeChildren(node, path);
		const nodeChildrenToShow = GetNodeChildrenToShow(node, path);
		const nodeForm = GetNodeForm(node, path);
		const nodeView = GetNodeView(map.id, path);
		const nodeTypeInfo = NodeType_Info.for[node.type];

		const sinceTime = GetTimeFromWhichToShowChangedNodes(map.id);
		const pathsToChangedDescendantNodes_withChangeTypes = GetPathsToChangedDescendantNodes_WithChangeTypes.CatchBail(emptyArray, map.id, sinceTime, path); // catch bail, to lazy-load path-changes
		const addedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.add).length;
		const editedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.edit).length;

		const parent = GetParentNodeL3(path);
		const parentPath = GetParentPath(path);
		//const parentNodeView = GetNodeView(map.id, parentPath);
		//const parentChildren = parent && parentPath ? GetNodeChildrenL3(parent.id, parentPath) : EA<NodeL3>();

		const boxExpanded = nodeView?.expanded ?? false;

		const childLayout = GetChildLayout_Final(node.current, map);
		//const childGroupsShowingDirect = [GetChildGroupLayout(ChildGroup.truth, childLayout)...];
		//const directChildrenArePolarized = childGroupsShowingDirect.length == 1 && && node.type == NodeType.claim;
		/*const truthBoxVisible = ShouldChildGroupBoxBeVisible(node, ChildGroup.truth, childLayout, nodeChildrenToShow);
		const relevanceBoxVisible = ShouldChildGroupBoxBeVisible(hereArg, ChildGroup.relevance, childLayout, hereArgChildrenToShow);
		const freeformBoxVisible = ShouldChildGroupBoxBeVisible(node, ChildGroup.freeform, childLayout, nodeChildrenToShow);
		const groupsUsingBoxes = (truthBoxVisible ? 1 : 0) + (relevanceBoxVisible ? 1 : 0) + (freeformBoxVisible ? 1 : 0);
		const directChildrenArePolarized = (node.type == NodeType.argument && !relevanceBoxVisible) || (node.type == NodeType.claim && !truthBoxVisible);*/

		const ncToShow_generic = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.generic);
		const ncToShow_truth = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.truth);
		const ncToShow_relevance = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.relevance);
		const ncToShow_freeform = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.freeform);

		/*const playingTimeline = GetPlayingTimeline(map.id);
		const playingTimeline_currentStepIndex = GetPlayingTimelineStepIndex(map.id);
		// const playingTimelineShowableNodes = GetPlayingTimelineRevealNodes_All(map.id);
		// const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map.id, true);
		// if users scrolls to step X and expands this node, keep expanded even if user goes back to a previous step
		const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map.id);*/

		performance.mark("NodeUI_2");
		if (ShouldLog(a=>a.nodeRenders)) {
			if (logTypes.nodeRenders_for) {
				if (logTypes.nodeRenders_for == node.id) {
					console.log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node.id}`, "\nPropsChanged:", this.GetPropChanges(), "\nStateChanged:", this.GetStateChanges());
				}
			} else {
				console.log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node.id}`, "\nPropsChanged:", this.GetPropChanges().map(a=>a.key), "\nStateChanged:", this.GetStateChanges().map(a=>a.key));
			}
		}
		//NodeUI.renderCount++;
		//NodeUI.lastRenderTime = Date.now();

		const displayText = GetNodeDisplayText(node, path, map); // don't remove this; it's needed, since it's a dependency of GetMeasurementInfo, but within a "CatchBail" suppressor
		const {width} = GetMeasurementInfoForNode(node, path, map);

		const {ref_leftColumn_storage, ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath, {
			color: GetNodeColor(node, "connector", false).css(),
			gutterWidth: inBelowGroup ? GUTTER_WIDTH_SMALL : GUTTER_WIDTH, parentGutterWidth: GUTTER_WIDTH,
			//gutterWidth: inBelowGroup ? (GUTTER_WIDTH_SMALL + 40) : GUTTER_WIDTH, parentGutterWidth: GUTTER_WIDTH,
			parentIsAbove: inBelowGroup,
		}, {nodeType: node.type, width, expanded: boxExpanded});

		// Assert(!relevanceArguments.Any(a=>a.type == NodeType.claim), "Single-premise argument has more than one premise!");
		/*if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
			// relevanceArguments = relevanceArguments.filter(child => playingTimelineVisibleNodes.Contains(`${argumentPath}/${child.id}`));
			// if this node (or a descendent) is marked to be revealed by a currently-applied timeline-step, reveal this node
			relevanceArguments = relevanceArguments.filter(child=>playingTimelineVisibleNodes.Any(a=>a.startsWith(`${argumentPath}/${child.id}`)));
		}*/

		let treeChildrenAddedSoFar = 0;

		// hooks must be constant between renders, so always init the shape (comps will just not be added to tree, if shouldn't be visible)
		const nodeChildHolder_truth = IsChildGroupValidForNode(node, ChildGroup.truth) &&
			<NodeChildHolder {...{map, parentNode: node, parentPath: path, separateChildren: true, showArgumentsControlBar: true}}
				parentTreePath={treePath} parentTreePath_priorChildCount={treeChildrenAddedSoFar}
				group={ChildGroup.truth}
				showEvenIfParentNotExpanded={false}
				belowNodeUI={false}
				minWidth={0}
				nodeChildrenToShow={ncToShow_truth}
			/>;
		treeChildrenAddedSoFar += ncToShow_truth.length + 3; // + 3 is for the arguments-control-bar, and the two possible limit-bars (it's ok to over-reserve slots)
		const nodeChildHolder_relevance = IsChildGroupValidForNode(node, ChildGroup.relevance) &&
			<NodeChildHolder {...{map, parentNode: node, parentPath: path, separateChildren: true, showArgumentsControlBar: true}}
				parentTreePath={treePath} parentTreePath_priorChildCount={treeChildrenAddedSoFar}
				group={ChildGroup.relevance}
				showEvenIfParentNotExpanded={false}
				belowNodeUI={false}
				minWidth={0}
				nodeChildrenToShow={ncToShow_relevance}
			/>;
		treeChildrenAddedSoFar += ncToShow_relevance.length + 3; // + 3 is for the arguments-control-bar, and the two possible limit-bars (it's ok to over-reserve slots)
		const nodeChildHolder_freeform = IsChildGroupValidForNode(node, ChildGroup.freeform) &&
			<NodeChildHolder {...{map, parentNode: node, parentPath: path, separateChildren: false, showArgumentsControlBar: false}}
				parentTreePath={treePath} parentTreePath_priorChildCount={treeChildrenAddedSoFar}
				group={ChildGroup.freeform}
				showEvenIfParentNotExpanded={false}
				belowNodeUI={false}
				minWidth={0}
				nodeChildrenToShow={ncToShow_freeform}
			/>;
		treeChildrenAddedSoFar += ncToShow_freeform.length + 1; // + 1 is for the one possible limit-bar (it's ok to over-reserve slots)

		let nodeChildHolder_generic: JSX.Element|n;
		const nodeChildHolder_generic_ref = UseCallback(c=>this.nodeChildHolder_generic = c, []);
		const showGenericBelow = node.type == NodeType.argument;
		if (showGenericBelow || boxExpanded) {
			nodeChildHolder_generic = <NodeChildHolder {...{map, parentNode: node, parentPath: path, separateChildren: false, showArgumentsControlBar: false}}
				parentTreePath={treePath} parentTreePath_priorChildCount={treeChildrenAddedSoFar}
				ref={nodeChildHolder_generic_ref}
				group={ChildGroup.generic}
				showEvenIfParentNotExpanded={node.type == NodeType.argument}
				belowNodeUI={showGenericBelow}
				minWidth={showGenericBelow && standardWidthInGroup ? standardWidthInGroup - GUTTER_WIDTH_SMALL : 0}
				nodeChildrenToShow={ncToShow_generic}
			/>;
			treeChildrenAddedSoFar += ncToShow_generic.length + 1; // + 1 is for the one possible limit-bar (it's ok to over-reserve slots)
		}

		//const childrenShownByNodeExpandButton = nodeChildrenToShow.length + (hereArgChildrenToShow?.length ?? 0);
		const childrenShownByNodeExpandButton = node.type == NodeType.argument ? ncToShow_relevance : nodeChildrenToShow;

		performance.mark("NodeUI_3");
		performance.measure("NodeUI_Part1", "NodeUI_1", "NodeUI_2");
		performance.measure("NodeUI_Part2", "NodeUI_2", "NodeUI_3");
		this.Stash({nodeChildrenToShow}); // for debugging

		const {css} = cssHelper(this);
		return (
			<>
				<Column
					ref={useCallback(c=>{
						this.nodeUI = c;
						const dom = GetDOM(c);
						ref_leftColumn(dom);
						if (dom) {
							dom["nodeGroup"] = ref_group.current;
							if (ref_group.current) dom.classList.add(`lcForNodeGroup_${ref_group.current.path}`);
						}
					}, [ref_leftColumn, ref_group])}
					className="NodeUI innerBoxColumn clickThrough"
					style={css(
						{
							//position: "relative",
							position: "absolute",
							/*paddingTop: gapBeforeInnerUI,
							paddingBottom: gapAfterInnerUI,*/
							//width: "100%",
							opacity: standardWidthInGroup != 0 ? 1 : 0,
							//paddingLeft: inBelowGroup ? 20 : 30,
							boxSizing: "content-box",
							paddingLeft: GUTTER_WIDTH + (inBelowGroup ? GUTTER_WIDTH_SMALL : 0),
						},
						style,
					)}
				>
					{/*node.current.accessLevel != AccessLevel.basic &&
					<div style={{position: "absolute", right: "calc(100% + 5px)", top: 0, bottom: 0, display: "flex", fontSize: 10}}>
						<span style={{margin: "auto 0"}}>{AccessLevel[node.current.accessLevel][0].toUpperCase()}</span>
					</div>*/}
					<CloneHistoryButton node={node}/>
					<NodeUI_Inner ref={UseCallback(c=>{
						this.innerUI = GetInnerComp(c);
						if (ref_innerUI) ref_innerUI(c);
					}, [ref_innerUI])} {...{indexInNodeList, map, node, path, treePath, width, standardWidthInGroup}}/>
					{/* these are for components shown just to the right of the NodeUI_Inner box */}
					{nodeChildrenToShow == emptyArray_forLoading &&
						<div style={{margin: "auto 0 auto 10px"}}>...</div>}
					{!path.includes("/") && nodeChildrenToShow != emptyArray_forLoading && nodeChildrenToShow.length == 0 && /*playingTimeline == null &&*/ IsRootNode.CatchBail(false, node) &&
						<div style={{margin: "auto 0 auto 10px", background: liveSkin.OverlayPanelBackgroundColor().css(), padding: 5, borderRadius: 5}}>To add a node, right click on the root node.</div>}
					{!boxExpanded &&
						<NodeChildCountMarker {...{map, path}} childCount={childrenShownByNodeExpandButton.length}/>}
				</Column>
				{boxExpanded && nodeChildHolder_truth}
				{boxExpanded && nodeChildHolder_relevance}
				{boxExpanded && nodeChildHolder_freeform}
				{(boxExpanded || showGenericBelow) && nodeChildHolder_generic}
			</>
		);
	}

	// this is needed to handle certain cases (eg. where this node-view's expansion state is set to collapsed) not caught by downstream-events + ref-callback (well, when wrapped in UseCallback(...))
	PostRender() {
		//FlashComp(this, {text: "NodeUI rendered"});
		this.CheckForChanges();
	}

	// don't actually check for changes until re-rendering has stopped for 500ms
	lastObservedValues = new ObservedValues();
	CheckForChanges = ()=>{
		//FlashComp(this, {text: "NodeUI.CheckForChanges"});
		const {node, onHeightOrPosChange} = this.PropsState;
		if (this.DOM_HTML == null) return;

		const obs = new ObservedValues({
			innerUIHeight: this.SafeGet(a=>a.innerUI!.DOM_HTML.offsetHeight, 0),
			childrensHeight: this.rightColumn?.DOM_HTML.offsetHeight ?? 0,
			// see UseSize_Method for difference between offsetHeight and the alternatives
			height: this.DOM_HTML.offsetHeight
				// if argument, the nodeChildHolder_generic element is not "within" this.DOM_HTML; so add its height manually
				+ (node.type == NodeType.argument && this.nodeChildHolder_generic != null ? this.nodeChildHolder_generic.DOM_HTML.offsetHeight : 0),
		});
		if (ShallowEquals(obs, this.lastObservedValues)) return;

		this.SetState({obs});

		if (obs.innerUIHeight != this.lastObservedValues.innerUIHeight) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
				()=>`OnInnerUIHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node.id}${nl}NewInnerUIHeight:${obs.innerUIHeight}`);
			// if (onHeightOrPosChange) onHeightOrPosChange();
		}
		if (obs.height != this.lastObservedValues.height) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
				()=>`OnHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node.id}${nl}NewHeight:${obs.height}`);
			if (onHeightOrPosChange) onHeightOrPosChange();
		}

		this.lastObservedValues = obs;
	};
}

export enum LimitBarPos {
	above = "above",
	below = "below",
	none = "none",
}