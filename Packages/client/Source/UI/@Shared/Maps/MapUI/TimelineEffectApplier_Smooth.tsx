import {CE, Lerp, SleepAsync, string, Vector2, VRect} from "js-vextensions";
import {observer} from "mobx-react";
import React, {useContext} from "react";
import {n} from "react-vcomponents/Dist/@Types.js";
import {Graph, NodeGroup, FlexNode, GetTreeNodeBaseRect, GetTreeNodeOffset} from "tree-grapher";
import {GetPathsWith1PlusFocusLevelAfterSteps, GetVisiblePathsAfterSteps, Map, TimelineStep} from "dm_common";
import {MapState} from "Store/main/maps/mapStates/@MapState";
import {GetOpenMapID} from "Store/main";
import {BailError, BailHandler, BailHandler_loadingUI_default, observer_mgl} from "web-vcore/nm/mobx-graphlink";
import {GetPercentThroughTransition, GetTimelineApplyEssentials, RevealPathsIncludesNode} from "../MapGraph";
import {ACTUpdateAnchorNodeAndViewOffset, MapUI} from "../MapUI";

//let ignoreNextZoomChange = false;
/** This component replaces the node-focusing portion of TimelineStepAffectApplier with a smoother variant of it, when the layout-helper map is loaded. (layout-helper is required for the smoothing) */
export const TimelineEffectApplier_Smooth = observer_mgl((props: {map: Map, mapState: MapState, mainGraph: Graph, layoutHelperGraph: Graph|n})=>{
	const {map, mapState, mainGraph, layoutHelperGraph} = props;
	//const zoomLevel = store.zoomLevel;
	/*if (ignoreNextZoomChange) {
		ignoreNextZoomChange = false;
		return null;
	}*/

	const data = GetTimelineApplyEssentials(GetOpenMapID());
	if (data == null) return null;
	const {currentStep_time, nextStep_time, stepsReached, stepsReachedAtNext} = data;
	if (currentStep_time == null || nextStep_time == null) return null;
	const currentTime = mapState.playingTimeline_time ?? 0;

	// todo: confirm that we don't need to filter the focus-node-paths to the visible-nodes here...
	//const lastFocusNodePaths = GetFocusNodePaths(map.id, currentTime); // could also use currentStep_time
	//const nextFocusNodePaths = GetFocusNodePaths(map.id, nextStep_time);
	const lastFocusNodePaths = GetPathsWith1PlusFocusLevelAfterSteps(stepsReached);
	const nextFocusNodePaths = GetPathsWith1PlusFocusLevelAfterSteps(stepsReachedAtNext);

	//const lastKeyframe_groupRects = GetGroupRectsAtKeyframe(map.id, mainGraph, layoutHelperGraph, currentStep_time);
	//const nextKeyframe_groupRects = GetGroupRectsAtKeyframe(map.id, mainGraph, layoutHelperGraph, nextStep_time);
	const lastKeyframe_groupRects = GetGroupRectsAtKeyframe(map.id, mainGraph, layoutHelperGraph, stepsReached);
	const nextKeyframe_groupRects = GetGroupRectsAtKeyframe(map.id, mainGraph, layoutHelperGraph, stepsReachedAtNext);
	if (lastKeyframe_groupRects == null || nextKeyframe_groupRects == null) return null;

	const MergeNodeRects = (nodePaths: string[], groupRectsAtTargetTime: NativeMap<string, VRect>)=>{
		let nodeRectsMerged: VRect|n;
		for (const [nodePath, rect] of groupRectsAtTargetTime) {
			//if (RevealPathsIncludesNode(nodePaths, nodePath) && rect) {
			if (nodePaths.includes(nodePath) && rect) { // only include exact matches; focus-nodes do not auto-include their ancestors
				nodeRectsMerged = nodeRectsMerged ? nodeRectsMerged.Encapsulating(rect) : rect;
			}
		}
		return nodeRectsMerged;
	};
	const lastFocusNodeRectsMerged = MergeNodeRects(lastFocusNodePaths, lastKeyframe_groupRects);
	const nextFocusNodeRectsMerged = MergeNodeRects(nextFocusNodePaths, nextKeyframe_groupRects);
	if (lastFocusNodeRectsMerged == null || nextFocusNodeRectsMerged == null) return null;
	const percentFromLastToNext = GetPercentThroughTransition(currentStep_time, nextStep_time, mapState.playingTimeline_time);
	const focusNodeRects_interpolated = InterpolateRect(lastFocusNodeRectsMerged, nextFocusNodeRectsMerged, percentFromLastToNext);
	//console.log("percentFromLastToNext:", percentFromLastToNext);

	// apply the target scroll-and-zoom
	// ==========

	// do these checks after calculating the above info; we need the mobx listeners to get set up (since the container-attachment is not mobx-signaling)
	if (mainGraph.containerEl == null) return null;
	/*const scrollEl = mainGraph.getScrollElFromContainerEl(mainGraph.containerEl);
	if (scrollEl == null) return null;*/
	const mapUI = MapUI.CurrentMapUI;
	if (mapUI == null) return null;

	//const viewportSize = new Vector2(scrollEl.clientWidth, scrollEl.clientHeight);
	const viewportEl = mapUI.mapUIEl!.parentElement!.parentElement!;
	const viewportSize = new Vector2(viewportEl.clientWidth, viewportEl.clientHeight);
	// apply just enough zoom-out to be able to fit all of the focus-nodes within the viewport
	const zoomRequired = Math.min(viewportSize.x / focusNodeRects_interpolated.width, viewportSize.y / focusNodeRects_interpolated.height);
	const newZoom = CE(zoomRequired * .9).KeepBetween(.1, 1);

	function doScroll() {
		//ScrollToPosition_Center(scrollEl!, focusNodeRects_interpolated.Center.Times(mapState.zoomLevel));
		mapUI!.ScrollToPosition_Center(focusNodeRects_interpolated.Center.Times(mapState.zoomLevel));
		ACTUpdateAnchorNodeAndViewOffset(map.id);
	}

	(async()=>{
		await SleepAsync(1);
		//ignoreNextZoomChange = true;
		mapState.zoomLevel = newZoom;
		// re-call this function, since we need to recalc // edit: Actually, is this even necessary? I don't think it should be... (well, the ACTUpdateAnchorNodeAndViewOffset call might need the delay)
		//setTimeout(()=>FocusOnNodes(mapID, paths), 100);
		//return;
		await SleepAsync(1);
		doScroll();
	})();

	return <></>;
});

/*function ScrollToPosition_Center(scrollEl: HTMLElement, posInContainer: Vector2) {
	const scrollContainerViewportSize = new Vector2(scrollEl.getBoundingClientRect().width, scrollEl.getBoundingClientRect().height);
	//const topBarsHeight = window.innerHeight - scrollContainerViewportSize.y;

	//const oldScroll = GetScroll(scrollEl);
	const newScroll = new Vector2(
		posInContainer.x - (scrollContainerViewportSize.x / 2),
		posInContainer.y - (scrollContainerViewportSize.y / 2),
		// scroll down a bit extra, such that node is center of window, not center of scroll-view container/viewport (I've tried both, and this way is more centered "perceptually")
		//(posInContainer.y - (scrollContainerViewportSize.y / 2)) + (topBarsHeight / 2),
	);
	console.log("Loading scroll:", newScroll.toString());
	SetScroll(scrollEl, newScroll);
}*/
export const GetScroll = (scrollEl: HTMLElement)=>new Vector2(scrollEl.scrollLeft, scrollEl.scrollTop);
export const SetScroll = (scrollEl: HTMLElement, scroll: Vector2)=>{ scrollEl.scrollLeft = scroll.x; scrollEl.scrollTop = scroll.y; };

export function InterpolateRect(rectA: VRect, rectB: VRect, percent: number) {
	return new VRect(
		Lerp(rectA.x, rectB.x, percent),
		Lerp(rectA.y, rectB.y, percent),
		Lerp(rectA.width, rectB.width, percent),
		Lerp(rectA.height, rectB.height, percent),
	);
}

export function GetGroupRectsAtKeyframe(mapID: string, mainGraph: Graph, layoutHelperGraph: Graph|n, appliedSteps: TimelineStep[]) {
	//return CE([...mainGraph.groupsByPath.entries()]).ToMap(a=>a[0], a=>a[1].InnerUIRect!);

	const nodesVisibleAtStep = GetVisiblePathsAfterSteps(appliedSteps);

	let tree: FlexNode<NodeGroup>;
	if (layoutHelperGraph != null) {
		tree = layoutHelperGraph.GetLayout(undefined, group=>{
			//return mainGraph.groupsByPath.has(group.path);
			//return nodesVisibleAtStep.includes(group.leftColumn_userData?.["nodePath"] as string);
			return RevealPathsIncludesNode(nodesVisibleAtStep, group.leftColumn_userData?.["nodePath"] as string);
		})!;
	} else {
		tree = mainGraph.GetLayout()!;
		/*tree = mainGraph.GetLayout(undefined, group=>{
			return nodesVisibleAtKeyframe.includes(group.leftColumn_userData?.["nodePath"] as string);
		})!;*/
	}
	if (tree == null) return null;

	const treeNodes = tree.nodes; // This is a getter, and pretty expensive (at scale)! So cache its value here.
	const nodeRects_base: VRect[] = treeNodes.map(node=>GetTreeNodeBaseRect(node));
	const {offset} = GetTreeNodeOffset(nodeRects_base, treeNodes, mainGraph.containerPadding);
	const nodeRects_final = nodeRects_base.map(a=>a.NewPosition(b=>b.Plus(offset)));

	const groupRects = new window.Map<string, VRect>();
	for (const [i, treeNode] of treeNodes.entries()) {
		const nodePath = treeNode.data.leftColumn_userData?.["nodePath"] as string;
		groupRects.set(nodePath, nodeRects_final[i]);
	}
	return groupRects;
}