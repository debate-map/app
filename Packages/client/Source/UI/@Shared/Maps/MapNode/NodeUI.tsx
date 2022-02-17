import {ChangeType, ChildGroup, GetChildLayout_Final, GetNodeChildrenL3, GetNodeForm, GetParentNodeL3, GetParentPath, IsMultiPremiseArgument, IsNodeL2, IsNodeL3, IsPremiseOfSinglePremiseArgument, IsRootNode, IsSinglePremiseArgument, Map, MapNodeL3, MapNodeType, MapNodeType_Info, ShouldChildGroupBoxBeVisible} from "dm_common";
import React, {useCallback} from "react";
import {GetPathsToChangedDescendantNodes_WithChangeTypes} from "Store/db_ext/mapNodeEdits.js";
import {GetNodeChildrenL3_Advanced, GetNodeColor} from "Store/db_ext/nodes";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {ConnectorLinesUI, StripesCSS, useRef_nodeLeftColumn} from "tree-grapher";
import {NodeChildHolder} from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolder.js";
import {NodeChildHolderBox} from "UI/@Shared/Maps/MapNode/NodeUI/NodeChildHolderBox.js";
import {logTypes} from "Utils/General/Logging.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {TreeGraphDebug} from "Utils/UI/General.js";
import {EB_ShowError, EB_StoreError, MaybeLog, Observer, ShouldLog, WaitXThenRun_Deduped} from "web-vcore";
import {Assert, AssertWarn, E, EA, ea, emptyArray_forLoading, IsNaN, nl, ShallowEquals, Vector2, VRect} from "web-vcore/nm/js-vextensions.js";
import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, cssHelper, GetDOM, GetInnerComp, RenderSource, UseCallback, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {NodeChangesMarker} from "./NodeUI/NodeChangesMarker.js";
import {NodeChildCountMarker} from "./NodeUI/NodeChildCountMarker.js";
import {GetMeasurementInfoForNode} from "./NodeUI/NodeMeasurer.js";
import {NodeUI_Inner} from "./NodeUI_Inner.js";
import {NodeUI_Menu_Stub} from "./NodeUI_Menu.js";

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
		indexInNodeList: number, map: Map, node: MapNodeL3, path: string, treePath: string, style?,
		inBelowGroup?: boolean,
		widthOverride?: number|n, // this is set by parent NodeChildHolder, once it determines the width that all children should use
		onHeightOrPosChange?: ()=>void
		ref_innerUI?: (c: NodeUI_Inner|n)=>any,
	},
	{
		//expectedBoxWidth: 0, expectedBoxHeight: 0,
		obs: new ObservedValues(),
		aboveSize_truth: 0, belowSize_truth: 0,
		aboveSize_relevance: 0, belowSize_relevance: 0,
		aboveSize_freeform: 0, belowSize_freeform: 0,
		aboveSize_direct: 0, belowSize_direct: 0,
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
	nodeChildHolder_direct: NodeChildHolder|n;
	componentDidCatch(message, info) { EB_StoreError(this as any, message, info); }
	render() {
		if (this.state["error"]) return EB_ShowError(this.state["error"]);
		const {indexInNodeList, map, node, path, widthOverride, style, onHeightOrPosChange, ref_innerUI, treePath, inBelowGroup, children} = this.props;
		const {obs, aboveSize_truth, belowSize_truth, aboveSize_relevance, belowSize_relevance, aboveSize_freeform, belowSize_freeform, aboveSize_direct, belowSize_direct} = this.state;

		performance.mark("NodeUI_1");

		const GetNodeChildren = (node2: MapNodeL3|n, path2: string|n): MapNodeL3[]=>(node2 && path2 ? GetNodeChildrenL3(node2.id, path2) : ea);
		const GetNodeChildrenToShow = (node2: MapNodeL3|n, path2: string|n): MapNodeL3[]=>(node2 && path2 ? GetNodeChildrenL3_Advanced(node2.id, path2, map.id, true, undefined, true, true) : ea);

		const nodeChildren = GetNodeChildren(node, path);
		const nodeChildrenToShow = GetNodeChildrenToShow(node, path);
		const nodeForm = GetNodeForm(node, path);
		const nodeView = GetNodeView(map.id, path);
		const nodeTypeInfo = MapNodeType_Info.for[node.type];

		//const sinceTime = GetTimeFromWhichToShowChangedNodes(map.id);
		const sinceTime = 0;
		const pathsToChangedDescendantNodes_withChangeTypes = GetPathsToChangedDescendantNodes_WithChangeTypes(map.id, sinceTime, path);
		const addedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.add).length;
		const editedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.edit).length;

		const parent = GetParentNodeL3(path);
		const parentPath = GetParentPath(path);
		const parentNodeView = GetNodeView(map.id, parentPath);
		const parentChildren = parent && parentPath ? GetNodeChildrenL3(parent.id, parentPath) : EA<MapNodeL3>();

		const isSinglePremiseArgument = IsSinglePremiseArgument(node);
		const isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);
		const isMultiPremiseArgument = IsMultiPremiseArgument(node);
		const hereArg = node.type == MapNodeType.argument ? node : isPremiseOfSinglePremiseArg ? parent : null;
		const hereArgNodePath = hereArg == node ? path : hereArg == parent ? parentPath : null;
		const hereArgChildren = hereArg ? GetNodeChildren(hereArg, hereArgNodePath) : null;
		const hereArgChildrenToShow = hereArg ? GetNodeChildrenToShow(hereArg, hereArgNodePath).filter(a=>a.id != node.id) : null;
		const boxExpanded = nodeView?.expanded ?? false;

		/*const siblingNodeViews = Object.entries(parentNodeView?.children ?? {}).filter(a=>parentNodeView?.renderedChildrenOrder?.includes(a[0])).OrderBy(a=>parentNodeView?.renderedChildrenOrder?.indexOf(a[0]));
		const ownIndexInSiblings = siblingNodeViews.findIndex(a=>a[0] == node.id);
		let isFirstExpandedSibling = nodeView.expanded && siblingNodeViews.slice(0, ownIndexInSiblings).every(a=>!a[1].expanded);
		let isLastExpandedSibling = nodeView.expanded && siblingNodeViews.slice(ownIndexInSiblings + 1).every(a=>!a[1].expanded);
		const grandParentNodeView = GetNodeView(map.id, SlicePath(path, 2));
		let ownIndexInVisualSiblings = -2;
		if (isPremiseOfSinglePremiseArg && grandParentNodeView) {
			const visualSiblingNodeViews = Object.entries(grandParentNodeView.children).filter(a=>grandParentNodeView.renderedChildrenOrder?.includes(a[0])).OrderBy(a=>grandParentNodeView.renderedChildrenOrder?.indexOf(a[0]));
			ownIndexInVisualSiblings = visualSiblingNodeViews.findIndex(a=>a[0] == parent!.id);
			if (!visualSiblingNodeViews.slice(0, ownIndexInVisualSiblings).every(a=>!a[1].expanded)) isFirstExpandedSibling = false;
			if (!visualSiblingNodeViews.slice(ownIndexInVisualSiblings + 1).every(a=>!a[1].expanded)) isLastExpandedSibling = false;
		}*/

		const childLayout = GetChildLayout_Final(node.current, map);
		//const childGroupsShowingDirect = [GetChildGroupLayout(ChildGroup.truth, childLayout)...];
		//const directChildrenArePolarized = childGroupsShowingDirect.length == 1 && && node.type == MapNodeType.claim;
		const truthBoxVisible = ShouldChildGroupBoxBeVisible(node, ChildGroup.truth, childLayout, nodeChildrenToShow);
		const relevanceBoxVisible = ShouldChildGroupBoxBeVisible(hereArg, ChildGroup.relevance, childLayout, hereArgChildrenToShow);
		const freeformBoxVisible = ShouldChildGroupBoxBeVisible(node, ChildGroup.freeform, childLayout, nodeChildrenToShow);
		const groupsUsingBoxes = (truthBoxVisible ? 1 : 0) + (relevanceBoxVisible ? 1 : 0) + (freeformBoxVisible ? 1 : 0);

		const ncToShow_generic = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.generic);
		const ncToShow_truth = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.truth);
		const hereArgChildrenToShow_relevance = hereArgChildrenToShow?.filter(a=>a.link?.group == ChildGroup.relevance) ?? ea as MapNodeL3[];
		const ncToShow_freeform = nodeChildrenToShow.filter(a=>a.link?.group == ChildGroup.freeform);
		const ncToShow_direct: MapNodeL3[] = [
			...ncToShow_generic,
			...(truthBoxVisible ? [] : ncToShow_truth),
			//...(relevanceBoxVisible ? [] : hereArgChildrenToShow_relevance),
			...(freeformBoxVisible ? [] : ncToShow_freeform),
		];
		const usingDirect = ncToShow_direct.length;

		const boxCenterPoints = [] as number[];
		let boxSizesSum = 0;
		const holderBoxHeight = 22;
		if (truthBoxVisible) {
			boxCenterPoints.push(aboveSize_truth + (holderBoxHeight / 2));
			boxSizesSum += aboveSize_truth + holderBoxHeight + belowSize_truth;
		}
		if (relevanceBoxVisible) {
			boxCenterPoints.push(boxSizesSum + aboveSize_relevance + (holderBoxHeight / 2));
			boxSizesSum += aboveSize_relevance + holderBoxHeight + belowSize_relevance;
		}
		if (freeformBoxVisible) {
			boxCenterPoints.push(boxSizesSum + aboveSize_freeform + (holderBoxHeight / 2));
			boxSizesSum += aboveSize_freeform + holderBoxHeight + belowSize_freeform;
		}
		if (usingDirect) {
			boxCenterPoints.push(aboveSize_direct);
			boxSizesSum += aboveSize_direct + belowSize_direct;
		}

		const linkSpawnPoint = boxCenterPoints.Average();

		/*let gapBeforeInnerUI = 5;
		let gapAfterInnerUI = 5;
		if (boxExpanded && !isFirstExpandedSibling) gapBeforeInnerUI += linkSpawnPoint - (obs.innerUIHeight / 2);
		if (boxExpanded && !isLastExpandedSibling) gapAfterInnerUI += linkSpawnPoint - (obs.innerUIHeight / 2);
		let rightColumnOffset = 0;
		if (isFirstExpandedSibling) {
			rightColumnOffset =
				-linkSpawnPoint // align right-column's anchor-point (where its connector lines' start) to this-rect's top
				+ gapBeforeInnerUI + (obs.innerUIHeight / 2); // then shift that anchor-point down to center of inner-ui
		}
		const newHeight = gapBeforeInnerUI + obs.innerUIHeight + gapAfterInnerUI;*/
		//FlashComp(this, {wait: 0, text: `IsFirstExp:${isFirstExpandedSibling} @isLastExp:${isLastExpandedSibling} @t1:${ownIndexInSiblings} @t2:${ownIndexInVisualSiblings}`});

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
					Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node.id}`, "\nPropsChanged:", this.GetPropChanges(), "\nStateChanged:", this.GetStateChanges());
				}
			} else {
				Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node.id}`, "\nPropsChanged:", this.GetPropChanges().map(a=>a.key), "\nStateChanged:", this.GetStateChanges().map(a=>a.key));
			}
		}
		//NodeUI.renderCount++;
		//NodeUI.lastRenderTime = Date.now();

		const proxyNodeUI_ref = UseCallback(c=>this.proxyDisplayedNodeUI = c, []);
		// if single-premise arg, combine arg and premise into one box, by rendering premise box directly (it will add-in this argument's child relevance-arguments)
		if (isSinglePremiseArgument) {
			const premises = nodeChildren.filter(a=>a && a.type == MapNodeType.claim);
			if (premises.length) {
				AssertWarn(premises.length == 1, `Single-premise argument #${node.id} has more than one premise! (${premises.map(a=>a.id).join(",")})`);
				const premise = premises[0];

				// if has child-limit bar, correct its path
				const firstChildComp = this.FlattenedChildren[0] as any;
				if (firstChildComp && firstChildComp.props.path == path) {
					firstChildComp.props.path = `${firstChildComp.props.path}/${premise.id}`;
				}

				return (
					<NodeUI ref={proxyNodeUI_ref} {...this.props} key={premise.id} map={map} node={premise} path={`${path}/${premise.id}`}>
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
						<NodeUI_Menu_Stub {...{map, node, path}} childGroup={ChildGroup.generic}/>
					</Row>
				</Column>
			);
		}

		// Assert(!relevanceArguments.Any(a=>a.type == MapNodeType.claim), "Single-premise argument has more than one premise!");
		/*if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
			// relevanceArguments = relevanceArguments.filter(child => playingTimelineVisibleNodes.Contains(`${argumentPath}/${child.id}`));
			// if this node (or a descendent) is marked to be revealed by a currently-applied timeline-step, reveal this node
			relevanceArguments = relevanceArguments.filter(child=>playingTimelineVisibleNodes.Any(a=>a.startsWith(`${argumentPath}/${child.id}`)));
		}*/

		const {width} = this.GetMeasurementInfo();

		let nextChildFullIndex = 0;
		const GetTreePathForNextTreeChild = ()=>`${treePath}/${nextChildFullIndex++}`;

		// hooks must be constant between renders, so always init the shape (comps will just not be added to tree, if shouldn't be visible)
		const nodeChildHolderBox_truth = //truthBoxVisible &&
			<NodeChildHolderBox {...{map, node, path}} group={ChildGroup.truth}
				treePath={truthBoxVisible ? GetTreePathForNextTreeChild() : "n/a"} inBelowGroup={false}
				widthOfNode={widthOverride || width} heightOfNode={obs.innerUIHeight}
				nodeChildren={nodeChildren} nodeChildrenToShow={ncToShow_truth}
				onSizesChange={UseCallback((aboveSize, belowSize)=>{
					this.SetState({aboveSize_truth: aboveSize, belowSize_truth: belowSize});
					this.CheckForChanges();
				}, [])}/>;
		const nodeChildHolderBox_relevance = //relevanceBoxVisible &&
			<NodeChildHolderBox {...{map}} group={ChildGroup.relevance}
				node={isPremiseOfSinglePremiseArg ? parent! : node} path={isPremiseOfSinglePremiseArg ? parentPath! : path}
				treePath={relevanceBoxVisible ? GetTreePathForNextTreeChild() : "n/a"} inBelowGroup={false}
				widthOfNode={widthOverride || width} heightOfNode={obs.innerUIHeight}
				nodeChildren={hereArgChildren ?? ea} nodeChildrenToShow={hereArgChildrenToShow_relevance}
				onSizesChange={UseCallback((aboveSize, belowSize)=>{
					this.SetState({aboveSize_relevance: aboveSize, belowSize_relevance: belowSize});
					this.CheckForChanges();
				}, [])}/>;
		const nodeChildHolderBox_freeform = //freeformBoxVisible &&
			<NodeChildHolderBox {...{map, node, path}} group={ChildGroup.freeform}
				treePath={freeformBoxVisible ? GetTreePathForNextTreeChild() : "n/a"} inBelowGroup={false}
				widthOfNode={widthOverride || width} heightOfNode={obs.innerUIHeight}
				nodeChildren={nodeChildren} nodeChildrenToShow={ncToShow_freeform}
				onSizesChange={UseCallback((aboveSize, belowSize)=>{
					this.SetState({aboveSize_freeform: aboveSize, belowSize_freeform: belowSize});
					this.CheckForChanges();
				}, [])}/>;
		let nodeChildHolder_direct: JSX.Element|n;
		const nodeChildHolder_direct_ref = UseCallback(c=>this.nodeChildHolder_direct = c, []);
		const nodeChildHolder_direct_onSizesChange = UseCallback((aboveSize, belowSize)=>{
			this.SetState({aboveSize_direct: aboveSize, belowSize_direct: belowSize});
			this.CheckForChanges();
		}, []);
		if (usingDirect && boxExpanded) {
			//const showArgumentsControlBar = directChildrenArePolarized && (node.type == MapNodeType.claim || isSinglePremiseArgument) && boxExpanded && nodeChildrenToShow != emptyArray_forLoading;
			nodeChildHolder_direct = <NodeChildHolder {...{map, node, path, separateChildren: false, showArgumentsControlBar: false}}
				treePath={treePath}
				treePath_priorChildCount={nextChildFullIndex} // because we use this, this group must go last
				ref={nodeChildHolder_direct_ref}
				// type={node.type == MapNodeType.claim && node._id != demoRootNodeID ? ChildGroup.truth : null}
				group={ChildGroup.generic}
				usesGenericExpandedField={true}
				belowNodeUI={isMultiPremiseArgument}
				minWidth={isMultiPremiseArgument && widthOverride ? widthOverride - 20 : 0}
				//childrenWidthOverride={isMultiPremiseArgument && widthOverride ? widthOverride - 20 : null}
				/*nodeChildren={nodeChildren}*/ nodeChildrenToShow={ncToShow_direct}
				onSizesChange={nodeChildHolder_direct_onSizesChange}/>;
		}

		performance.mark("NodeUI_3");
		performance.measure("NodeUI_Part1", "NodeUI_1", "NodeUI_2");
		performance.measure("NodeUI_Part2", "NodeUI_2", "NodeUI_3");
		this.Stash({nodeChildrenToShow}); // for debugging

		const {ref_leftColumn_storage, ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath, {
			color: GetNodeColor(hereArg ?? node, "raw", false).css(),
			gutterWidth: inBelowGroup ? 20 : 30, parentGutterWidth: 30,
			parentIsAbove: inBelowGroup,
		});

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
							opacity: widthOverride != 0 ? 1 : 0,
							//paddingLeft: inBelowGroup ? 20 : 30,
							boxSizing: "content-box",
							paddingLeft: 30 + (inBelowGroup ? 20 : 0),
						},
						style,
					)}
				>
					{/*node.current.accessLevel != AccessLevel.basic &&
					<div style={{position: "absolute", right: "calc(100% + 5px)", top: 0, bottom: 0, display: "flex", fontSize: 10}}>
						<span style={{margin: "auto 0"}}>{AccessLevel[node.current.accessLevel][0].toUpperCase()}</span>
					</div>*/}
					<NodeUI_Inner ref={UseCallback(c=>{
						this.innerUI = GetInnerComp(c);
						if (ref_innerUI) ref_innerUI(c);
					}, [ref_innerUI])} {...{indexInNodeList, map, node, path, treePath, width, widthOverride}}/>
					{/* these are for components shown just to the right of the NodeUI_Inner box */}
					{nodeChildrenToShow == emptyArray_forLoading &&
						<div style={{margin: "auto 0 auto 10px"}}>...</div>}
					{IsRootNode(node) && nodeChildrenToShow != emptyArray_forLoading && nodeChildrenToShow.length == 0 && /*playingTimeline == null &&*/
						<div style={{margin: "auto 0 auto 10px", background: liveSkin.OverlayPanelBackgroundColor().css(), padding: 5, borderRadius: 5}}>To add a node, right click on the root node.</div>}
					{!boxExpanded &&
						<NodeChildCountMarker childCount={nodeChildrenToShow.length + (hereArgChildrenToShow?.length ?? 0)}/>}
					{!boxExpanded && (addedDescendants > 0 || editedDescendants > 0) &&
						<NodeChangesMarker {...{addedDescendants, editedDescendants}}/>}
				</Column>
				{boxExpanded &&
				<>
					{/*childConnectorBackground*/}
					{/*<ConnectorLinesUI treePath={treePath} width={30} linesFromAbove={false}/>*/}
					{truthBoxVisible && nodeChildHolderBox_truth}
					{relevanceBoxVisible && nodeChildHolderBox_relevance}
					{/*<NodeChildHolderBox {...{map, node, path}} group={ChildGroup.neutrality}
						ref={UseCallback(c=>this.childBoxes["neutrality"] = c, [])}
						ref_expandableBox={UseCallback(c=>WaitXThenRun_Deduped(this, "UpdateChildBoxOffsets", 0, ()=>this.UpdateChildBoxOffsets()), [])}
						widthOfNode={widthOverride || width} heightOfNode={innerUIHeight}
						nodeChildren={ea} nodeChildrenToShow={ea}/>*/}
					{freeformBoxVisible && nodeChildHolderBox_freeform}
					{nodeChildHolder_direct}
				</>}
			</>
		);
	}
	proxyDisplayedNodeUI: NodeUI|n;
	get NodeUIForDisplayedNode() {
		return this.proxyDisplayedNodeUI || this;
	}

	// this is needed to handle certain cases (eg. where this node-view's expansion state is set to collapsed) not caught by downstream-events + ref-callback (well, when wrapped in UseCallback(...))
	PostRender() {
		//FlashComp(this, {text: "NodeUI rendered"});
		this.CheckForChanges();
	}

	// don't actually check for changes until re-rendering has stopped for 500ms
	// CheckForChanges = _.debounce(() => {
	lastObservedValues = new ObservedValues();
	CheckForChanges = ()=>{
		//FlashComp(this, {text: "NodeUI.CheckForChanges"});
		const {node, onHeightOrPosChange} = this.PropsState;
		if (this.DOM_HTML == null) return;
		const isMultiPremiseArgument = IsMultiPremiseArgument.CatchBail(false, node);

		const obs = new ObservedValues({
			innerUIHeight: this.SafeGet(a=>a.innerUI!.DOM_HTML.offsetHeight, 0),
			childrensHeight: this.rightColumn?.DOM_HTML.offsetHeight ?? 0,
			// see UseSize_Method for difference between offsetHeight and the alternatives
			height: this.DOM_HTML.offsetHeight
				// if multi-premise-arg, the nodeChildHolder_direct element is not "within" this.DOM_HTML; so add its height manually
				+ (isMultiPremiseArgument && this.nodeChildHolder_direct != null ? this.nodeChildHolder_direct.DOM_HTML.offsetHeight : 0),
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

	// GetMeasurementInfo(/*props: Props, state: State*/) {
	measurementInfo_cache: MeasurementInfo;
	measurementInfo_cache_lastUsedProps;
	/* ComponentWillReceiveProps(newProps) {
		this.GetMeasurementInfo(newProps, false); // refresh measurement-info when props change
	} */
	// GetMeasurementInfo(useCached: boolean) {
	GetMeasurementInfo(): MeasurementInfo {
		if (this.proxyDisplayedNodeUI) return this.proxyDisplayedNodeUI.GetMeasurementInfo();

		const {props} = this;
		const props_used = this.props.IncludeKeys("map", "node", "path", "inBelowGroup") as typeof props;
		// Log("Checking whether should remeasure info for: " + props_used.node._id);
		if (this.measurementInfo_cache && ShallowEquals(this.measurementInfo_cache_lastUsedProps, props_used)) return this.measurementInfo_cache;

		const {map, node, path, inBelowGroup} = props_used;
		//const subnodes = GetSubnodesInEnabledLayersEnhanced(MeID(), map.id, node.id);
		const leftMarginForLines = inBelowGroup ? 20 : 0;
		let {expectedBoxWidth, width, expectedHeight} = GetMeasurementInfoForNode.CatchBail({} as ReturnType<typeof GetMeasurementInfoForNode>, node, path, leftMarginForLines);
		if (expectedBoxWidth == null) return {expectedBoxWidth: 100, width: 100}; // till data is loaded, just return this

		const isMultiPremiseArgument = IsMultiPremiseArgument(node);
		if (isMultiPremiseArgument) {
			// expectedBoxWidth = expectedBoxWidth.KeepAtLeast(350);
			width = width.KeepAtLeast(350);
			// expectedBoxWidth += 20;
			//width += 20; // give extra space for left-margin
		}

		this.measurementInfo_cache = {expectedBoxWidth, width/* , expectedHeight */};
		this.measurementInfo_cache_lastUsedProps = props_used;
		return this.measurementInfo_cache;
	}
}
type MeasurementInfo = {expectedBoxWidth: number, width: number};

export enum LimitBarPos {
	above = "above",
	below = "below",
	none = "none",
}