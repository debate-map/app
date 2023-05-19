import {autorun, action} from "web-vcore/nm/mobx.js";
import {GetPlayingTimeline, GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {GetOpenMapID} from "Store/main";
import {ACTNodeExpandedSet} from "Store/main/maps/mapViews/$mapView.js";
import {store} from "Store";
import {MapUI, ACTUpdateAnchorNodeAndViewOffset} from "UI/@Shared/Maps/MapUI.js";
import {SleepAsync, Vector2, VRect} from "web-vcore/nm/js-vextensions.js";
import {NodeBox} from "UI/@Shared/Maps/Node/NodeBox.js";
import {GetDOM} from "web-vcore/nm/react-vextensions.js";
import {GetViewportRect, RunWithRenderingBatched} from "web-vcore";
import {SlicePath, GetAsync, RunInAction} from "web-vcore/nm/mobx-graphlink.js";
import {GetTimelineStep, GetVisiblePathsAfterSteps, TimelineStep, GetTimelineSteps, GetPathsWith1PlusFocusLevelAfterSteps} from "dm_common";
import {RunWithRenderingBatchedAndBailsCaught} from "Utils/UI/General";

/*function AreSetsEqual(setA, setB) {
	return setA.size === setB.size && [...setA].every((value) => setB.has(value));
}*/

let playingTimeline_lastStep: number|n;
autorun(()=>{
	// const playingTimeline_currentStep = GetPlayingTimelineStep(mapID);
	const mapID = GetOpenMapID();
	const mapState = GetMapState(mapID);
	if (mapID == null || mapState == null) return;
	const {playingTimeline_step} = mapState;
	if (playingTimeline_step != playingTimeline_lastStep) {
		playingTimeline_lastStep = playingTimeline_step;
		if (playingTimeline_step != null) {
			ApplyNodeEffectsForTimelineStepsUpToX(mapID, playingTimeline_step);
		}
	}
}, {name: "TimelineNodeFocuser"});

async function ApplyNodeEffectsForTimelineStepsUpToX(mapID: string, stepIndex: number) {
	//const newlyRevealedNodes = await GetAsync(() => GetPlayingTimelineCurrentStepRevealNodes(action.payload.mapID));
	// we have to break it into parts, otherwise the current-step might change while we're doing the processing, short-circuiting the expansion
	const [stepsUpToTarget, step] = await GetAsync(()=>{
		//const playingTimeline_currentStep = GetPlayingTimelineStep(mapID);
		const timeline = GetPlayingTimeline(mapID);
		if (timeline == null) return [null, null];
		const steps = GetTimelineSteps(timeline.id);
		return [steps.slice(0, stepIndex + 1), steps[stepIndex]];
	});
	if (stepsUpToTarget == null || step == null) return;

	// for the just-reached step, apply the expansion part required its node "show" effects (the actual showing/hiding of node-ui is handled within NodeUI.tsx)
	const newlyRevealedNodePaths = await GetAsync(()=>GetVisiblePathsAfterSteps([step]));
	//console.log(`@Step(${step.id}) @NewlyRevealedNodes(${newlyRevealedNodes})`);
	if (newlyRevealedNodePaths.length) {
		ExpandToNodes(mapID, newlyRevealedNodePaths);
		// commented; for first project, we want the full-fledged automatic scroll-and-zoom system working, but...
		// todo: make this configurable for the timeline creator and/or visitor (options: manual expand + zoom + scroll, auto expand + scroll-to-new, or auto expand + zoom + scroll to all focus-nodes)
		//FocusOnNodes(mapID, newlyRevealedNodePaths);
	}

	// for the just-reached step, apply node expand/collapse effects
	for (const nodeReveal of step.nodeReveals) {
		if (nodeReveal.setExpandedTo != null) {
			ACTNodeExpandedSet({mapID, path: nodeReveal.path, expanded: nodeReveal.setExpandedTo});
		}
	}

	// for all steps reached so far, apply scrolling and zooming such that the current list of focus-nodes are all visible (just sufficiently so)
	const focusNodes = await GetAsync(()=>GetPathsWith1PlusFocusLevelAfterSteps(stepsUpToTarget));
	FocusOnNodes(mapID, focusNodes);
}

async function ExpandToNodes(mapID: string, paths: string[]) {
	// const { UpdateAnchorNodeAndViewOffset } = require('../../UI/@Shared/Maps/MapUI'); // eslint-disable-line

	for (const path of paths) {
		const parentPath = SlicePath(path, 1);
		if (parentPath == null) continue;
		ACTNodeExpandedSet({mapID, path: parentPath, expanded: true, expandAncestors: true});
	}
}

async function FocusOnNodes(mapID: string, paths: string[]) {
	let mapUI: MapUI|n;
	for (let i = 0; i < 30 && mapUI == null; i++) {
		if (i > 0) await SleepAsync(100);
		mapUI = MapUI.CurrentMapUI;
	}
	if (mapUI == null) {
		console.log("Failed to find MapUI to apply scroll to.");
		return;
	}

	let nodeBoxes: NodeBox[] = [];
	for (let i = 0; i < 30 && nodeBoxes.length < paths.length; i++) {
		if (i > 0) await SleepAsync(100);
		nodeBoxes = paths.map(path=>mapUI!.FindNodeBox(path)).filter(nodeBox=>{
			if (nodeBox == null) return false;
			const dom = GetDOM(nodeBox);
			if (dom == null) return false;
			if (dom.parentElement!.style.opacity == "0" || dom.parentElement!.style.left == "") return false;
			return true;
		}) as NodeBox[];
	}
	if (nodeBoxes.length == 0) {
		console.log("Failed to find any of the NodeBoxes to apply scroll to. Paths:", paths);
		return;
	}

	let focusNodeRectsMerged: VRect|n;
	for (const box of nodeBoxes) {
		const boxDom = GetDOM(box);
		if (boxDom == null) continue;
		// const boxPos = GetViewportRect(GetDOM(box)).Center.Minus(GetViewportRect(mapUI.mapUIEl).Position);
		const boxRect = GetViewportRect(boxDom).NewPosition(a=>a.Minus(GetViewportRect(mapUI!.mapUIEl!).Position));
		focusNodeRectsMerged = focusNodeRectsMerged ? focusNodeRectsMerged.Encapsulating(boxRect) : boxRect;
	}
	if (focusNodeRectsMerged == null) return;

	const mapState = GetMapState.NN(mapID);
	const nodeBoxesMerged_sizeWhenUnscaled = focusNodeRectsMerged.Size.DividedBy(mapState.zoomLevel);

	const viewportEl = mapUI.mapUIEl!.parentElement!.parentElement!;
	const viewportSize = new Vector2(viewportEl.clientWidth, viewportEl.clientHeight);
	// apply just enough zoom-out to be able to fit all of the focus-nodes within the viewport
	const zoomRequired = Math.min(viewportSize.x / nodeBoxesMerged_sizeWhenUnscaled.x, viewportSize.y / nodeBoxesMerged_sizeWhenUnscaled.y);
	const newZoom = (zoomRequired * .9).FloorTo(.1).KeepBetween(.1, 1);
	if (newZoom.Distance(mapState.zoomLevel) > .01) {
		RunInAction("FocusOnNodes.zoomOut", ()=>mapState.zoomLevel = newZoom);
		// re-call this function, since we need to recalc // edit: Actually, is this even necessary? I don't think it should be...
		setTimeout(()=>FocusOnNodes(mapID, paths), 100);
		return;
	}

	/* const nodeBoxPositionAverage = nodeBoxPositionSum.Times(1 / paths.length);
	// mapUI.ScrollToPosition(new Vector2((nodeBoxPositionAverage.x - 100).KeepAtLeast(0), nodeBoxPositionAverage.y));
	mapUI.ScrollToPosition_Center(nodeBoxPositionAverage.Plus(-250, 0)); */
	//mapUI.ScrollToMakeRectVisible(nodeBoxesMerged, 100);
	mapUI.ScrollToPosition_Center(focusNodeRectsMerged.Center);
	ACTUpdateAnchorNodeAndViewOffset(mapID);
}