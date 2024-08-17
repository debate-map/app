import {autorun, action} from "mobx";
import {GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {GetOpenMapID} from "Store/main";
import {ACTNodeExpandedSet, GetNodeViewsAlongPath, GetNodeViewsBelowPath} from "Store/main/maps/mapViews/$mapView.js";
import {store} from "Store";
import {MapUI, ACTUpdateAnchorNodeAndViewOffset} from "UI/@Shared/Maps/MapUI.js";
import {SleepAsync, Vector2, VRect, WaitXThenRun} from "js-vextensions";
import {NodeBox} from "UI/@Shared/Maps/Node/NodeBox.js";
import {GetDOM} from "react-vextensions";
import {GetViewportRect, RunWithRenderingBatched} from "web-vcore";
import {SlicePath, GetAsync, RunInAction} from "mobx-graphlink";
import {GetTimelineStep, TimelineStep, GetTimelineSteps, ToPathNodes, DMap, GetNodeEffects, NodeView} from "dm_common";
import {RunWithRenderingBatchedAndBailsCaught} from "Utils/UI/General";
import {GetPlaybackInfo} from "Store/main/maps/mapStates/PlaybackAccessors/Basic";
import {GetPathsWith1PlusFocusLevelAfterEffects, GetPlaybackEffects, GetPlaybackEffectsReached, GetVisiblePathsAfterEffects, PlaybackEffect} from "Store/main/maps/mapStates/PlaybackAccessors/ForEffects";
import {AutoRun_HandleBail} from "./@Helpers";

/*function AreSetsEqual(setA, setB) {
	return setA.size === setB.size && [...setA].every((value) => setB.has(value));
}*/

/**
 * The functions in this file apply *some* of the effects from the timeline, to the map:
 * * Apply the "base expanding/collapsing" of nodes. (ie. makes the show-children arrow button show as expanded; node-hiding also occurs within accessor tree though, in GetNodeChildrenL3_Advanced)
 * * Does scrolling to the current playback focus-nodes, IF the layout-helper-map is disabled.
 * 
 * Note: This is not the only place where effects are applied to the map. See also:
 * * TimelineEffectApplier_Smooth: Applies scrolling and zooming effects, smoothly, IF the layout-helper-map is enabled.
 * * GetNodeChildrenL3_Advanced: Does filtering on children, to hide nodes that should not be visible at the current point in playback.
 */

let playback_lastEffectIndexApplied: number|n;
AutoRun_HandleBail(()=>{
	const playback = GetPlaybackInfo();
	if (playback == null) return;
	//const effects = GetPlaybackEffects();
	const effectsReached = GetPlaybackEffectsReached();
	const effectIndex = effectsReached.length - 1;
	if (effectIndex != -1 && effectIndex != playback_lastEffectIndexApplied) {
		/*const effectsToApply =
			playback_lastEffectIndexApplied == null ? effects.slice(0, effectIndex + 1) :
			effectIndex > playback_lastEffectIndexApplied ? effects.slice(playback_lastEffectIndexApplied + 1, effectIndex + 1) :
			[];
		const effectsToUndo =
			playback_lastEffectIndexApplied == null ? [] :
			playback_lastEffectIndexApplied > effectIndex ? effects.slice(effectIndex + 1, playback_lastEffectIndexApplied + 1).reverse() : // reverse, so that effects are undone right-to-left
			[];
		if (effectsToApply.length || effectsToUndo.length) {
			ApplyEffectsOfType_setExpandedTo(playback.map.id, effectsToApply, effectsToUndo, effectIndex);
		}*/
		//WaitXThenRun(0, ()=>{});
		ApplyEffectsOfType_show_hide_setExpandedTo(playback.map, effectsReached, effectIndex);

		// for all steps reached so far, apply scrolling and zooming such that the current list of focus-nodes are all visible (just sufficiently so)
		// if layout-helper-map is enabled, node-focusing happens in a more precise way, in TimelineEffectApplier_Smooth.tsx
		if (!store.main.timelines.layoutHelperMap_load) {
			const focusNodes = GetPathsWith1PlusFocusLevelAfterEffects(effectsReached);
			FocusOnNodes(playback.map.id, focusNodes);
		}

		playback_lastEffectIndexApplied = effectIndex;
	}
}, {name: "TimelineStepEffectApplier"});

let ApplyEffectsOfType_show_hide_setExpandedTo_lastPathsVisible = [] as string[];
function ApplyEffectsOfType_show_hide_setExpandedTo(map: DMap, effectsReached: PlaybackEffect[], effectIndex: number) {
	const pathsVisibleAtThisPoint = GetVisiblePathsAfterEffects([map.rootNode], effectsReached);
	if (pathsVisibleAtThisPoint == ApplyEffectsOfType_show_hide_setExpandedTo_lastPathsVisible) return;
	ApplyEffectsOfType_show_hide_setExpandedTo_lastPathsVisible = pathsVisibleAtThisPoint;

	// apply the store changes all in one react-batch, so that any dependent ui-components only have to re-render once
	RunWithRenderingBatched(()=>{
		// apply the store changes in one mobx-batch, so that any dependent accessors only have to re-execute once
		RunInAction(`ApplyEffectsOfType_setExpandedTo.forEffectIndex:${effectIndex}`, ()=>{
			//console.log("Applying node show/hide/setExpandTo effects. @effectIndex:", effectIndex, "@pathsVisibleAtThisPoint:", pathsVisibleAtThisPoint);

			// first clear all expanded-states
			/*ACTNodeExpandedSet({mapID: map.id, path: map.rootNode, expanded: false, resetSubtree: true});
			// then apply node expandings necessary to reach the nodes that should be visible in the current step
			if (pathsVisibleAtThisPoint.length) {
				ExpandToNodes(map.id, pathsVisibleAtThisPoint);
			}*/

			// We want to collapse everything, then expand just the nodes that should be visible in the current step.
			// However, the naive approach causes lots of unnecessary field changes. (eg. the clear-all collapses nodes that we're about to expand!)
			// So, we first collect the lists of nodes to collapse and expand, then do the minimal set of changes required to yield the correct outcome.
			const nodeViewsToCollapseAtStart = [...GetNodeViewsBelowPath(map.id, map.rootNode, true).values()];
			const nodeViewsToExpandAtEnd = pathsVisibleAtThisPoint.SelectMany(path=>GetNodeViewsAlongPath(map.id, path, true)).Distinct();
			const nodeViewsToCollapse_actual = nodeViewsToCollapseAtStart.filter(a=>a.expanded).Exclude(...nodeViewsToExpandAtEnd);
			const nodeViewsToExpand_actual = nodeViewsToExpandAtEnd.filter(a=>!a.expanded);
			//console.log("Collapsing:", nodeViewsToCollapse_actual.length, "Expanding:", nodeViewsToCollapse_actual.length);
			nodeViewsToCollapse_actual.forEach(a=>a.expanded = false);
			nodeViewsToExpand_actual.forEach(a=>a.expanded = true);
		});
	});
}

function ExpandToNodes(mapID: string, paths: string[]) {
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
		// re-call this function, since we need to recalc // edit: Actually, is this even necessary? I don't think it should be... (well, the ACTUpdateAnchorNodeAndViewOffset call might need the delay)
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