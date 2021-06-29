// import {autorun, action} from "web-vcore/nm/mobx.js";
// import {GetPlayingTimeline, GetMapState} from "Store/main/maps/mapStates/$mapState.js";
// import {GetOpenMapID} from "Store/main";
// import {ACTMapNodeExpandedSet} from "Store/main/maps/mapViews/$mapView.js";
// import {store} from "Store";
// import {MapUI, ACTUpdateFocusNodeAndViewOffset} from "UI/@Shared/Maps/MapUI.js";
// import {SleepAsync, VRect} from "web-vcore/nm/js-vextensions.js";
// import {NodeUI_Inner} from "UI/@Shared/Maps/MapNode/NodeUI_Inner.js";
// import {GetDOM} from "web-vcore/nm/react-vextensions.js";
// import {GetScreenRect} from "web-vcore";
// import {SlicePath, GetAsync} from "web-vcore/nm/mobx-graphlink.js";
// import {GetTimelineStep, GetNodesRevealedInSteps} from "dm_common";

// /* function AreSetsEqual(setA, setB) {
// 	return setA.size === setB.size && [...setA].every((value) => setB.has(value));
// } */

// // let nodesThatShouldBeRevealed_last = new Set();
// // let lastPlayingTimelineStep: TimelineStep:
// // let lastPlayingTimelineStep_nodeRevealIDs: Set<string>;
// let lastPlayingTimeline_step: number;
// autorun(()=>{
// 	// const playingTimeline_currentStep = GetPlayingTimelineStep(mapID);
// 	/* const timeline = GetPlayingTimeline(GetOpenMapID());
// 	const nodesThatShouldBeRevealed = GetNodesRevealedInSteps(GetPlayingTimelineCurrentStepRevealNodes eSteps([step]));
// 	// Log(`@Step(${step.id}) @NewlyRevealedNodes(${newlyRevealedNodes})`);
// 	if (newlyRevealedNodes.length) {
// 		// stats=>Log("Requested paths:\n==========\n" + stats.requestedPaths.VKeys().join("\n") + "\n\n"));
// 		ExpandToAndFocusOnNodes(action.payload.mapID, newlyRevealedNodes);
// 	} */

// 	/* const timeline = GetPlayingTimeline(mapID);
// 	if (timeline == null) return;
// 	const stepID = timeline.steps[];
// 	const playingTimelineStep = GetTimelineStep(stepID);
// 	const playingTimelineStep_nodeRevealIDs = new Set(GetNodesRevealedInSteps([playingTimelineStep]));

// 	// todo: fix issue hit earlier

// 	if (!AreSetsEqual(playingTimelineStep_nodeRevealIDs, lastPlayingTimelineStep_nodeRevealIDs)) {
// 		const newlyRevealedNodes = playingTimelineStep_nodeRevealIDs;
// 		if (newlyRevealedNodes.size) {
// 			// stats=>Log("Requested paths:\n==========\n" + stats.requestedPaths.VKeys().join("\n") + "\n\n"));
// 			ExpandToAndFocusOnNodes(mapID, Array.from(newlyRevealedNodes));
// 		}
// 	}
// 	lastPlayingTimelineStep_nodeRevealIDs = playingTimelineStep_nodeRevealIDs; */

// 	// const playingTimeline_currentStep = GetPlayingTimelineStep(mapID);
// 	const mapID = GetOpenMapID();
// 	const mapState = GetMapState(mapID);
// 	if (mapState == null) return;
// 	const {playingTimeline_step} = mapState;
// 	if (playingTimeline_step != lastPlayingTimeline_step) {
// 		lastPlayingTimeline_step = playingTimeline_step;
// 		StartExpandingToAndFocusingOnNodesForStep(GetOpenMapID(), playingTimeline_step);
// 	}
// }, {name: "TimelineNodeFocuser"});

// async function StartExpandingToAndFocusingOnNodesForStep(mapID: string, stepIndex: number) {
// 	// const newlyRevealedNodes = await GetAsync(() => GetPlayingTimelineCurrentStepRevealNodes(action.payload.mapID));
// 	// we have to break it into parts, otherwise the current-step might change while we're doing the processing, short-circuiting the expansion
// 	const step = await GetAsync(()=>{
// 		// const playingTimeline_currentStep = GetPlayingTimelineStep(mapID);
// 		const timeline = GetPlayingTimeline(mapID);
// 		const stepID = timeline?.steps[stepIndex];
// 		return GetTimelineStep(stepID);
// 	});
// 	if (step == null) return;
// 	const newlyRevealedNodes = await GetAsync(()=>GetNodesRevealedInSteps([step]));
// 	// Log(`@Step(${step.id}) @NewlyRevealedNodes(${newlyRevealedNodes})`);
// 	if (newlyRevealedNodes.length) {
// 		// stats=>Log("Requested paths:\n==========\n" + stats.requestedPaths.VKeys().join("\n") + "\n\n"));
// 		ExpandToAndFocusOnNodes(mapID, newlyRevealedNodes);
// 	}
// }

// async function ExpandToAndFocusOnNodes(mapID: string, paths: string[]) {
// 	// const { UpdateFocusNodeAndViewOffset } = require('../../UI/@Shared/Maps/MapUI'); // eslint-disable-line

// 	for (const path of paths) {
// 		const parentPath = SlicePath(path, 1);
// 		ACTMapNodeExpandedSet({mapID, path: parentPath, expanded: true, expandAncestors: true});
// 	}

// 	let mapUI: MapUI;
// 	for (let i = 0; i < 30 && mapUI == null; i++) {
// 		if (i > 0) await SleepAsync(100);
// 		mapUI = MapUI.CurrentMapUI;
// 	}
// 	if (mapUI == null) {
// 		Log("Failed to find MapUI to apply scroll to.");
// 		return;
// 	}

// 	let nodeBoxes: NodeUI_Inner[] = [];
// 	for (let i = 0; i < 30 && nodeBoxes.length < paths.length; i++) {
// 		if (i > 0) await SleepAsync(100);
// 		nodeBoxes = paths.map(path=>mapUI.FindNodeBox(path)).filter(a=>a != null && GetDOM(a));
// 	}
// 	if (nodeBoxes.length == 0) {
// 		Log("Failed to find any of the NodeBoxes to apply scroll to. Paths:", paths);
// 		return;
// 	}

// 	let nodeBoxesMerged: VRect;
// 	for (const box of nodeBoxes) {
// 		// const boxPos = GetScreenRect(GetDOM(box)).Center.Minus(GetScreenRect(mapUI.mapUIEl).Position);
// 		const boxRect = GetScreenRect(GetDOM(box)).NewPosition(a=>a.Minus(GetScreenRect(mapUI.mapUIEl).Position));
// 		nodeBoxesMerged = nodeBoxesMerged ? nodeBoxesMerged.Encapsulating(boxRect) : boxRect;
// 	}
// 	/* const nodeBoxPositionAverage = nodeBoxPositionSum.Times(1 / paths.length);
// 	// mapUI.ScrollToPosition(new Vector2((nodeBoxPositionAverage.x - 100).KeepAtLeast(0), nodeBoxPositionAverage.y));
// 	mapUI.ScrollToPosition_Center(nodeBoxPositionAverage.Plus(-250, 0)); */
// 	mapUI.ScrollToMakeRectVisible(nodeBoxesMerged, 100);
// 	ACTUpdateFocusNodeAndViewOffset(mapID);
// }