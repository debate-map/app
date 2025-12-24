import {ChildGroup, GetNodeChildrenL3, GetToolbarItemsToShow, GetUser, globalMapID, globalRootNodeID, IsChildGroupValidForNode, IsNodeL2, IsNodeL3, IsRootNode, DMap, NodeL3, NodeType} from "dm_common";
import React, {JSX, PropsWithChildren, Ref, useCallback, useEffect, useRef, useState} from "react";
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
import {DefaultLoadingUI, EB_ShowError, EB_StoreError, MaybeLog, Observer, ShouldLog, css2} from "web-vcore";
import {BailError, BailInfo} from "mobx-graphlink";
import {Assert, ea, emptyArray_forLoading, IsNaN, IsSpecialEmptyArray, nl, ShallowEquals} from "js-vextensions";
import {Column, Div} from "react-vcomponents";
import {BaseComponentPlus, cssHelper, GetDOM, GetInnerComp, RenderSource, UseCallback, WarnOfTransientObjectProps} from "react-vextensions";
import {GetPlaybackInfo} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {NodeDataForTreeGrapher} from "../MapGraph.js";
import {NodeBox} from "./NodeBox.js";
import {GUTTER_WIDTH, GUTTER_WIDTH_SMALL} from "./NodeLayoutConstants.js";
import {CloneHistoryButton} from "./NodeUI/CloneHistoryButton.js";
import {FocusNodeStatusMarker} from "./NodeUI/FocusNodeStatusMarker.js";
import {NodeChildCountMarker} from "./NodeUI/NodeChildCountMarker.js";
import {GetMeasurementInfoForNode} from "./NodeUI/NodeMeasurer.js";
import {observer_mgl} from "mobx-graphlink";

type NodeUI_Props = PropsWithChildren<{
	indexInNodeList: number,
	map: DMap,
	node: NodeL3,
	path: string,
	treePath: string,
	forLayoutHelper: boolean,
	style?: any,
	inBelowGroup?: boolean,
	/** Standardized width all siblings should use (set by parent NodeChildHolder). When 0/undefined: auto. */
	standardWidthInGroup?: number|n,
	onHeightOrPosChange?: ()=>void
	ref_nodeBox?: (c: HTMLDivElement|n)=>any,
	ref?: Ref<HTMLDivElement>,
}>;

type NodeUI_State = {
	obs: ObservedValues,
}

const validateProps = (props: NodeUI_Props)=>{
	const {node} = props;
	Assert(IsNodeL2(node), "Node supplied to NodeUI is not level-2!");
	Assert(IsNodeL3(node), "Node supplied to NodeUI is not level-3!");
};

const validateState = () => {
	// TODO
};

export type NodeUIElem = HTMLDivElement;

export const NodeUI = observer_mgl((props: NodeUI_Props)=>{
	const {indexInNodeList, map, node, path, standardWidthInGroup, style, onHeightOrPosChange, ref_nodeBox, treePath, forLayoutHelper, inBelowGroup, children} = props;
	const [obs, setObs] = useState(new ObservedValues());

	const lastObservedValues = useRef(new ObservedValues());
	const nodeUIRef = useRef<HTMLDivElement|n>(null);
	const nodeBoxRef = useRef<HTMLDivElement|n>(null);
	const rightColumn = useRef<Column|n>(null);
	//const nodeChildHolder_genericRef = useRef<NodeChildHolder|n>(null);

	// TODO: this was in class component before, we might need it back
	//if (this.state["error"]) return EB_ShowError(this.state["error"]);

	validateProps(props);
	validateState(); // TODO

//	// don't actually check for changes until re-rendering has stopped for 500ms
//	lastObservedValues = new ObservedValues();
	const checkForChanges = ()=>{
//		//FlashComp(this, {text: "NodeUI.CheckForChanges"});
//		const {node, onHeightOrPosChange} = this.PropsState;
//		if (this.DOM_HTML == null) return;
//
//		const obs = new ObservedValues({
//			innerUIHeight: this.SafeGet(a=>a.nodeBox!.DOM_HTML.offsetHeight, 0),
//			childrensHeight: this.rightColumn?.DOM_HTML.offsetHeight ?? 0,
//			// see UseSize_Method for difference between offsetHeight and the alternatives
//			height: this.DOM_HTML.offsetHeight
//				// if argument, the nodeChildHolder_generic element is not "within" this.DOM_HTML; so add its height manually
//				+ (node.type == NodeType.argument && this.nodeChildHolder_generic != null ? this.nodeChildHolder_generic.DOM_HTML.offsetHeight : 0),
//		});
//		if (ShallowEquals(obs, this.lastObservedValues)) return;
//
//		this.SetState({obs});
//
//		if (obs.innerUIHeight != this.lastObservedValues.innerUIHeight) {
//			MaybeLog(
//				a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
//				()=>`OnInnerUIHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node.id}${nl}NewInnerUIHeight:${obs.innerUIHeight}`,
//			);
//			// if (onHeightOrPosChange) onHeightOrPosChange();
//		}
//		if (obs.height != this.lastObservedValues.height) {
//			MaybeLog(
//				a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
//				()=>`OnHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node.id}${nl}NewHeight:${obs.height}`,
//			);
//			if (onHeightOrPosChange) onHeightOrPosChange();
//		}
//
//		this.lastObservedValues = obs;
	};

	// this is needed to handle certain cases (eg. where this node-view's expansion state is set to collapsed) not caught by downstream-events + ref-callback (well, when wrapped in UseCallback(...))
	useEffect(()=>{
		checkForChanges();
	});

	if (HKMode && map?.id == globalMapID && node.id == globalRootNodeID) {
		return <NodeUI_HK nodeID={globalRootNodeID_hk}/>;
	}

	if (DEV_DYN) performance.mark("NodeUI_1");

	// we use CatchBail here, to ensure that the NodeUI is able to render even if the children data hasn't loaded yet (avoids "jitter" of map layout, eg. node-a's child gets updated causing node-a to disappear then come back)
	// (and the use of "ea", ie. a constant empty-array, is so that downstream code/components can recognize the children-array as "still being loaded")
	const GetNodeChildren = (node2: NodeL3|n, path2: string|n): NodeL3[]=>(node2 && path2 ? GetNodeChildrenL3.CatchBail(ea, node2.id, path2) : ea);
	const GetNodeChildrenToShow = (node2: NodeL3|n, path2: string|n): NodeL3[]=>(node2 && path2 ? GetNodeChildrenL3_Advanced.CatchBail(ea, node2.id, path2, map.id, true, undefined, true) : ea);

	const useForcedExpand = UseForcedExpandForPath(path, forLayoutHelper);
	const nodeChildrenToShow = useForcedExpand ? GetNodeChildren(node, path) : GetNodeChildrenToShow(node, path);
	const nodeView = GetNodeView(map.id, path);
	const boxExpanded = (useForcedExpand ? true : null) ?? nodeView?.expanded ?? false;

	const ncToShow_generic = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.generic);
	const ncToShow_truth = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.truth);
	const ncToShow_relevance = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.relevance);
	const ncToShow_freeform = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.freeform);

	if (DEV_DYN) performance.mark("NodeUI_2");
	// TODO:
	//if (ShouldLog(a=>a.nodeRenders)) {
	//	if (logTypes.nodeRenders_for) {
	//		if (logTypes.nodeRenders_for == node.id) {
	//			console.log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node.id}`, "\nPropsChanged:", this.GetPropChanges(), "\nStateChanged:", this.GetStateChanges());
	//		}
	//	} else {
	//		console.log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node.id}`, "\nPropsChanged:", this.GetPropChanges().map(a=>a.key), "\nStateChanged:", this.GetStateChanges().map(a=>a.key));
	//	}
	//}

	const {width} = GetMeasurementInfoForNode(node, path, map);
	const toolbarItemsToShow = GetToolbarItemsToShow(node, path, map);
	const aboveToolbar_visible = toolbarItemsToShow.length > 0 &&

	// if argument, toolbar's shown to right of its regular content, rather than above -- unless the prefix-button is visible, in which case an "above toolbar" is shown instead/also
	(node.type != NodeType.argument || toolbarItemsToShow.Any(a=>a.panel == "prefix"));

	const {ref_leftColumn_storage, ref_leftColumn, ref_group} = useRef_nodeLeftColumn(
		treePath,
		{
			color: GetNodeColor(node, "connector", false).css(),
			gutterWidth: inBelowGroup ? GUTTER_WIDTH_SMALL : GUTTER_WIDTH, parentGutterWidth: GUTTER_WIDTH,
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
			parentTreePath={treePath}
			parentTreePath_priorChildCount={treeChildrenAddedSoFar}
			group={ChildGroup.freeform}
			showEvenIfParentNotExpanded={false}
			belowNodeUI={false}
			minWidth={0}
			nodeChildrenToShow={ncToShow_freeform}
		/>;
	treeChildrenAddedSoFar += ncToShow_freeform.length + 1; // + 1 is for the one possible limit-bar (it's ok to over-reserve slots)

	let nodeChildHolder_generic: JSX.Element|n;
	//const nodeChildHolder_generic_ref = UseCallback(c=>nodeChildHolder_generic_ref.current = c, []);
	const showGenericBelow = node.type == NodeType.argument;
	if (showGenericBelow || boxExpanded) {
		nodeChildHolder_generic = <NodeChildHolder {...{map, parentNode: node, parentPath: path, separateChildren: false, showArgumentsControlBar: false, forLayoutHelper}}
			parentTreePath={treePath} parentTreePath_priorChildCount={treeChildrenAddedSoFar}
			//ref={nodeChildHolder_generic_ref}
			group={ChildGroup.generic}
			showEvenIfParentNotExpanded={node.type == NodeType.argument}
			belowNodeUI={showGenericBelow}
			minWidth={showGenericBelow && standardWidthInGroup ? standardWidthInGroup - GUTTER_WIDTH_SMALL : 0}
			nodeChildrenToShow={ncToShow_generic}
		/>;
		treeChildrenAddedSoFar += ncToShow_generic.length + 1; // + 1 is for the one possible limit-bar (it's ok to over-reserve slots)
	}

	// we exclude premise and comment children from this expand-to-show count, because these are shown in other places (premises as vertically-below the node, and comments in the node's "Comments" panel)
	const childrenShownByNodeExpandButton = (node.type == NodeType.argument ? nodeChildrenToShow.Exclude(...ncToShow_generic) : nodeChildrenToShow).filter(a=>a.type != NodeType.comment);
	const playback = GetPlaybackInfo();
	const showFocusNodeStatusMarker = playback?.timeline != null && store.main.timelines.showFocusNodes;

	//TODO
	if (DEV_DYN) {
		//performance.mark("NodeUI_3");
		//performance.measure("NodeUI_Part1", "NodeUI_1", "NodeUI_2");
		//performance.measure("NodeUI_Part2", "NodeUI_2", "NodeUI_3");
		//this.Stash({nodeChildrenToShow}); // for debugging
	}

	const css = css2;

	const handleColumnRef = useCallback((c: Column|n)=>{
		const dom = c?.root;
		nodeUIRef.current = dom;
		ref_leftColumn(dom);
		if (dom) {
			dom["nodeGroup"] = ref_group.current;
			if (ref_group.current) dom.classList.add(`lcForNodeGroup_${ref_group.current.path}`);
		}
	}, [ref_leftColumn, ref_group]);

	const handleNodeBoxRef = useCallback((c: HTMLDivElement|null)=>{
		nodeBoxRef.current = c;
		if (ref_nodeBox) ref_nodeBox(c);
	}, [ref_nodeBox]);

	return (
		<>
			<Column ref={handleColumnRef}
				className={["NodeUI", "innerBoxColumn", "clickThrough"].filter(a=>a).join(" ")}
				style={css(
					{
						position: "absolute",
						opacity: standardWidthInGroup != 0 ? 1 : 0,
						boxSizing: "content-box",
						paddingLeft: GUTTER_WIDTH + (inBelowGroup ? GUTTER_WIDTH_SMALL : 0),
					},
					style,
				)}
			>

				{showFocusNodeStatusMarker && <FocusNodeStatusMarker map={map} node={node} path={path}/>}
				{!showFocusNodeStatusMarker && !store.main.maps.screenshotMode && <CloneHistoryButton node={node}/>}
				<NodeBox ref={handleNodeBoxRef}
					{...{indexInNodeList, map, node, path, treePath, forLayoutHelper, width, standardWidthInGroup}}
					childrenShownByNodeExpandButton={childrenShownByNodeExpandButton.length}
				/>
				{/* these are for components shown just to the right of the NodeBox box */}
				{nodeChildrenToShow == emptyArray_forLoading &&
					<div style={{margin: "auto 0 auto 10px"}}>...</div>}
				{!path.includes("/") && nodeChildrenToShow != emptyArray_forLoading && nodeChildrenToShow.length == 0 && /*playingTimeline == null &&*/ IsRootNode.CatchBail(false, node) && !store.main.timelines.hideEditingControls &&
					<div style={{margin: "auto 0 auto 10px", background: liveSkin.OverlayPanelBackgroundColor().css(), padding: 5, borderRadius: 5}}>To add a node, right click on the root node.</div>}
				{!boxExpanded &&
					<NodeChildCountMarker {...{map, path}} childCount={childrenShownByNodeExpandButton.length} childrenLoading={IsSpecialEmptyArray(nodeChildrenToShow)}/>}
			</Column>
			{boxExpanded && nodeChildHolder_truth}
			{boxExpanded && nodeChildHolder_relevance}
			{boxExpanded && nodeChildHolder_freeform}
			{(boxExpanded || showGenericBelow) && nodeChildHolder_generic}
		</>
	);
})

// class holding values that are derived entirely within CheckForChanges()
class ObservedValues {
	constructor(data?: Partial<ObservedValues>) {
		Object.assign(this, data);
	}
	innerUIHeight = 0;
	childrensHeight = 0; height = 0;
}

export enum LimitBarPos {
	above = "above",
	below = "below",
	none = "none",
}
