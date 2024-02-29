import {ChildGroup, GetNodeChildrenL3, GetToolbarItemsToShow, globalMapID, globalRootNodeID, IsChildGroupValidForNode, IsNodeL2, IsNodeL3, IsRootNode, Map, NodeL3, NodeType} from "dm_common";
import React, {useCallback} from "react";
import {GetNodeChildrenL3_Advanced, GetNodeColor} from "Store/db_ext/nodes";
import {store} from "Store/index.js";
import {UseForcedExpandForPath} from "Store/main/maps.js";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {useRef_nodeLeftColumn} from "tree-grapher";
import {NodeChildHolder} from "UI/@Shared/Maps/Node/NodeUI/NodeChildHolder.js";
import {HKMode} from "UI/@SL/SL.js";
import {logTypes} from "Utils/General/Logging.js";
import {globalRootNodeID_hk} from "Utils/LibIntegrations/MobXHK/HKInitBackend.js";
import {NodeUI_HK} from "Utils/LibIntegrations/MobXHK/NodeUI_HK.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {DefaultLoadingUI, EB_ShowError, EB_StoreError, MaybeLog, Observer, ShouldLog} from "web-vcore";
import {BailError, BailInfo} from "web-vcore/.yalc/mobx-graphlink";
import {Assert, ea, emptyArray_forLoading, IsNaN, nl, ShallowEquals} from "web-vcore/nm/js-vextensions.js";
import {Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, cssHelper, GetDOM, GetInnerComp, RenderSource, UseCallback, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {GetPlaybackInfo} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {NodeDataForTreeGrapher} from "../MapGraph.js";
import {NodeBox} from "./NodeBox.js";
import {GUTTER_WIDTH, GUTTER_WIDTH_SMALL} from "./NodeLayoutConstants.js";
import {CloneHistoryButton} from "./NodeUI/CloneHistoryButton.js";
import {FocusNodeStatusMarker} from "./NodeUI/FocusNodeStatusMarker.js";
import {NodeChildCountMarker} from "./NodeUI/NodeChildCountMarker.js";
import {GetMeasurementInfoForNode} from "./NodeUI/NodeMeasurer.js";

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
		indexInNodeList: number, map: Map, node: NodeL3, path: string, treePath: string, forLayoutHelper: boolean, style?,
		inBelowGroup?: boolean,
		standardWidthInGroup?: number|n, // this is set by parent NodeChildHolder, once it determines the width that all children should use
		onHeightOrPosChange?: ()=>void
		ref_nodeBox?: (c: NodeBox|n)=>any,
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
	nodeBox: NodeBox|n;
	rightColumn: Column|n;
	nodeChildHolder_generic: NodeChildHolder|n;

	// we don't have an easy way to position loading-uis within the new node-layout system, so don't show them at all for now (well, we render it for debugging purposes, but have it visually hidden)
	// todo: find a way to position the loading-uis within new node-layout system
	loadingUI = (info: BailInfo)=>{
		return <DefaultLoadingUI comp={info.comp} bailMessage={info.bailMessage} style={{display: "none"}}/>;
	};

	componentDidCatch(message, info) {
		if (message instanceof BailError) return;
		EB_StoreError(this as any, message, info);
	}
	render() {
		if (this.state["error"]) return EB_ShowError(this.state["error"]);
		const {indexInNodeList, map, node, path, standardWidthInGroup, style, onHeightOrPosChange, ref_nodeBox, treePath, forLayoutHelper, inBelowGroup, children} = this.props;
		const {obs} = this.state;

		if (HKMode && map?.id == globalMapID && node.id == globalRootNodeID) {
			return <NodeUI_HK nodeID={globalRootNodeID_hk}/>;
		}

		if (DEV_DYN) performance.mark("NodeUI_1");

		const GetNodeChildren = (node2: NodeL3|n, path2: string|n): NodeL3[]=>(node2 && path2 ? GetNodeChildrenL3(node2.id, path2) : ea);
		const GetNodeChildrenToShow = (node2: NodeL3|n, path2: string|n): NodeL3[]=>(node2 && path2 ? GetNodeChildrenL3_Advanced(node2.id, path2, map.id, true, undefined, true) : ea);

		//const nodeChildren = GetNodeChildren(node, path);
		const useForcedExpand = UseForcedExpandForPath(path, forLayoutHelper);
		const nodeChildrenToShow = useForcedExpand ? GetNodeChildren(node, path) : GetNodeChildrenToShow(node, path);
		const nodeView = GetNodeView(map.id, path);
		const boxExpanded = (useForcedExpand ? true : null) ?? nodeView?.expanded ?? false;

		const ncToShow_generic = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.generic);
		const ncToShow_truth = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.truth);
		const ncToShow_relevance = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.relevance);
		const ncToShow_freeform = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.freeform);

		// this filtering is applied in the GetNodeChildrenL3_Advanced function instead for now (eg. so that child-limit-bar doesn't need special handling)
		/*const playingTimeline = GetPlayingTimeline(map.id);
		const playingTimeline_currentStepIndex = GetPlayingTimelineStepIndex(map.id);
		//const playingTimelineShowableNodes = GetPlayingTimelineRevealNodes_All(map.id);
		const playingTimelineVisibleNodes = GetPlayingTimelineRevealPaths_UpToAppliedStep(map.id, false); // false, so that if users scrolls to step X and expands this node, keep expanded even if user goes back to a previous step
		if (playingTimeline != null && !playingTimelineVisibleNodes.Any(a=>a.startsWith(path))) return null;*/

		if (DEV_DYN) performance.mark("NodeUI_2");
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

		//const displayText = GetNodeDisplayText(node, path, map); // don't remove this; it's needed, since it's a dependency of GetMeasurementInfo, but within a "CatchBail" suppressor
		//const extractedPrefixTextInfo = GetExtractedPrefixTextInfo(node, path, map);
		const {width} = GetMeasurementInfoForNode(node, path, map);
		//const usesToolbarForPrefixText = extractedPrefixTextInfo?.extractLocation == "toolbar";
		//const aboveToolbar_visible = ShowNodeToolbars(map) && ((node.type != NodeType.argument && node.type != NodeType.category) || usesToolbarForPrefixText);
		const toolbarItemsToShow = GetToolbarItemsToShow(node, path, map);
		const aboveToolbar_visible = toolbarItemsToShow.length > 0 &&
			// if argument, toolbar's shown to right of its regular content, rather than above -- unless the prefix-button is visible, in which case an "above toolbar" is shown instead/also
			(node.type != NodeType.argument || toolbarItemsToShow.Any(a=>a.panel == "prefix"));

		const {ref_leftColumn_storage, ref_leftColumn, ref_group} = useRef_nodeLeftColumn(
			treePath,
			{
				color: GetNodeColor(node, "connector", false).css(),
				gutterWidth: inBelowGroup ? GUTTER_WIDTH_SMALL : GUTTER_WIDTH, parentGutterWidth: GUTTER_WIDTH,
				//gutterWidth: inBelowGroup ? (GUTTER_WIDTH_SMALL + 40) : GUTTER_WIDTH, parentGutterWidth: GUTTER_WIDTH,
				parentIsAbove: inBelowGroup,
			},
			new NodeDataForTreeGrapher({
				nodePath: path, nodeType: node.type, width, expanded: boxExpanded,
				aboveToolbar_visible,
				aboveToolbar_hasLeftButton: aboveToolbar_visible && toolbarItemsToShow.Any(a=>a.panel == "prefix"),
			}),
		);

		let treeChildrenAddedSoFar = 0;

		// hooks must be constant between renders, so always init the shape (comps will just not be added to tree, if shouldn't be visible)
		const nodeChildHolder_truth = IsChildGroupValidForNode(node, ChildGroup.truth) &&
			<NodeChildHolder {...{map, parentNode: node, parentPath: path, separateChildren: true, showArgumentsControlBar: true, forLayoutHelper}}
				parentTreePath={treePath} parentTreePath_priorChildCount={treeChildrenAddedSoFar}
				group={ChildGroup.truth}
				showEvenIfParentNotExpanded={false}
				belowNodeUI={false}
				minWidth={0}
				nodeChildrenToShow={ncToShow_truth}
			/>;
		treeChildrenAddedSoFar += ncToShow_truth.length + 3; // + 3 is for the arguments-control-bar, and the two possible limit-bars (it's ok to over-reserve slots)
		const nodeChildHolder_relevance = IsChildGroupValidForNode(node, ChildGroup.relevance) &&
			<NodeChildHolder {...{map, parentNode: node, parentPath: path, separateChildren: true, showArgumentsControlBar: true, forLayoutHelper}}
				parentTreePath={treePath} parentTreePath_priorChildCount={treeChildrenAddedSoFar}
				group={ChildGroup.relevance}
				showEvenIfParentNotExpanded={false}
				belowNodeUI={false}
				minWidth={0}
				nodeChildrenToShow={ncToShow_relevance}
			/>;
		treeChildrenAddedSoFar += ncToShow_relevance.length + 3; // + 3 is for the arguments-control-bar, and the two possible limit-bars (it's ok to over-reserve slots)
		const nodeChildHolder_freeform = IsChildGroupValidForNode(node, ChildGroup.freeform) &&
			<NodeChildHolder {...{map, parentNode: node, parentPath: path, separateChildren: false, showArgumentsControlBar: false, forLayoutHelper}}
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
			nodeChildHolder_generic = <NodeChildHolder {...{map, parentNode: node, parentPath: path, separateChildren: false, showArgumentsControlBar: false, forLayoutHelper}}
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

		const playback = GetPlaybackInfo();
		const showFocusNodeStatusMarker = playback?.timeline != null && store.main.timelines.showFocusNodes;

		if (DEV_DYN) {
			performance.mark("NodeUI_3");
			performance.measure("NodeUI_Part1", "NodeUI_1", "NodeUI_2");
			performance.measure("NodeUI_Part2", "NodeUI_2", "NodeUI_3");
			this.Stash({nodeChildrenToShow}); // for debugging
		}

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
					className={["NodeUI", "innerBoxColumn", "clickThrough"].filter(a=>a).join(" ")}
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

							// optimization for smoother scrolling [2024-02-28: confirmed to help] // commented; caused NodeDetailsUI to show up underneath the NodeUIs
							//willChange: "transform", // todo: maybe change to {willChange: "left, top"}
						},
						style,
					)}
				>
					{showFocusNodeStatusMarker &&
						<FocusNodeStatusMarker map={map} node={node} path={path}/>}
					{!showFocusNodeStatusMarker && !store.main.maps.screenshotMode &&
						<CloneHistoryButton node={node}/>}
					<NodeBox ref={UseCallback(c=>{
						this.nodeBox = GetInnerComp(c);
						if (ref_nodeBox) ref_nodeBox(c);
					}, [ref_nodeBox])} {...{indexInNodeList, map, node, path, treePath, forLayoutHelper, width, standardWidthInGroup}} childrenShownByNodeExpandButton={childrenShownByNodeExpandButton.length}/>
					{/* these are for components shown just to the right of the NodeBox box */}
					{nodeChildrenToShow == emptyArray_forLoading &&
						<div style={{margin: "auto 0 auto 10px"}}>...</div>}
					{!path.includes("/") && nodeChildrenToShow != emptyArray_forLoading && nodeChildrenToShow.length == 0 && /*playingTimeline == null &&*/ IsRootNode.CatchBail(false, node) && !store.main.timelines.hideEditingControls &&
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
			innerUIHeight: this.SafeGet(a=>a.nodeBox!.DOM_HTML.offsetHeight, 0),
			childrensHeight: this.rightColumn?.DOM_HTML.offsetHeight ?? 0,
			// see UseSize_Method for difference between offsetHeight and the alternatives
			height: this.DOM_HTML.offsetHeight
				// if argument, the nodeChildHolder_generic element is not "within" this.DOM_HTML; so add its height manually
				+ (node.type == NodeType.argument && this.nodeChildHolder_generic != null ? this.nodeChildHolder_generic.DOM_HTML.offsetHeight : 0),
		});
		if (ShallowEquals(obs, this.lastObservedValues)) return;

		this.SetState({obs});

		if (obs.innerUIHeight != this.lastObservedValues.innerUIHeight) {
			MaybeLog(
				a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
				()=>`OnInnerUIHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node.id}${nl}NewInnerUIHeight:${obs.innerUIHeight}`,
			);
			// if (onHeightOrPosChange) onHeightOrPosChange();
		}
		if (obs.height != this.lastObservedValues.height) {
			MaybeLog(
				a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
				()=>`OnHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node.id}${nl}NewHeight:${obs.height}`,
			);
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