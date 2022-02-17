import chroma, {Color} from "web-vcore/nm/chroma-js.js";
import {GetNodeChildrenL3, GetNodeRevisions, MapNodeL3, MapNodeRevision, MapNodeType, Polarity} from "dm_common";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GADDemo} from "UI/@GAD/GAD";
import {HSLA} from "web-vcore";
import {Assert} from "js-vextensions";

export function GetNodeColor(node: {type: MapNodeType, displayPolarity?: Polarity}, type: "raw" | "background" = "background", allowDemoOverride = true): chroma.Color {
	let result: chroma.Color;
	/*if (node.type == MapNodeType.category) result = chroma("rgb(40,60,80)"); //chroma("hsl(210,33%,24%)");
	else if (node.type == MapNodeType.package) result = chroma("rgb(30,120,150)"); //chroma("hsl(195,67%,35%)");
	else if (node.type == MapNodeType.multiChoiceQuestion) result = chroma("rgb(90,50,180)"); //chroma("hsl(258,57%,45%)");
	else if (node.type == MapNodeType.claim) result = chroma("rgb(0,80,150)"); //chroma("hsl(208,100%,29%)");
	else if (node.type == MapNodeType.argument) {
		if (node.displayPolarity == Polarity.supporting) result = chroma("rgb(30,100,30)"); //chroma("hsl(120,54%,25%)");
		else result = chroma("rgb(100,30,30)");
	} else {
		Assert(false);
	}*/

	/*if (node.type == MapNodeType.category) result = chroma("hsl(210,33%,24%)");
	else if (node.type == MapNodeType.package) result = chroma("hsl(195,67%,35%)");
	else if (node.type == MapNodeType.multiChoiceQuestion) result = chroma("hsl(258,57%,45%)");
	else if (node.type == MapNodeType.claim) result = chroma("hsl(208,100%,29%)");
	else if (node.type == MapNodeType.argument) {
		if (node.displayPolarity == Polarity.supporting) result = chroma("hsl(120,54%,25%)");
		else result = chroma("hsl(0,54%,25%)");
	} else {
		Assert(false);
	}*/

	if (node.type == MapNodeType.category) result = chroma("hsl(210,15%,24%)");
	else if (node.type == MapNodeType.package) result = chroma("hsl(195,35%,35%)");
	else if (node.type == MapNodeType.multiChoiceQuestion) result = chroma("hsl(258,20%,45%)");
	else if (node.type == MapNodeType.claim) result = chroma("hsl(208,55%,29%)");
	else if (node.type == MapNodeType.argument) {
		if (node.displayPolarity == Polarity.supporting) result = chroma("hsl(120,25%,25%)");
		else if (node.displayPolarity == Polarity.opposing) result = chroma("hsl(0,40%,25%)");
		else result = chroma("hsl(210,15%,24%)");
	} else {
		Assert(false);
	}

	/*if (node.type == MapNodeType.category) result = chroma("hsl(210,30%,70%)");
	else if (node.type == MapNodeType.package) result = chroma("hsl(195,40%,70%)");
	else if (node.type == MapNodeType.multiChoiceQuestion) result = chroma("hsl(258,15%,70%)");
	else if (node.type == MapNodeType.claim) result = chroma("hsl(208,40%,70%)");
	else if (node.type == MapNodeType.argument) {
		if (node.displayPolarity == Polarity.supporting) result = chroma("hsl(120,20%,70%)");
		else result = chroma("hsl(0,25%,70%)");
	} else {
		Assert(false);
	}*/

	if (type == "background") {
		result = GetNodeBackgroundColorFromRawColor(result);
	}

	if (allowDemoOverride && GADDemo) {
		//result = chroma.mix(result, HSLA(0, 0, 1), .7); // mix result with white (70% white, 30% normal color)
		result = chroma(HSLA(0, 0, 1));
	}

	return result;
}
export function GetNodeBackgroundColorFromRawColor(color: Color) {
	let result = chroma.mix(color, "black", 0.3); // mix background-color with black some
	result = result.alpha(0.9);
	return result;
}

export const GetNodeChildrenL3_Advanced = CreateAccessor((nodeID: string, path: string, mapID: string, includeMirrorChildren = true, tagsToIgnore?: string[], applyAccessLevels = false, applyTimeline = false): MapNodeL3[]=>{
	path = path || nodeID;

	/*const nodeChildrenL2 = GetNodeChildrenL2(nodeID, includeMirrorChildren, tagsToIgnore);
	let nodeChildrenL3 = nodeChildrenL2.map(child=>(child ? GetNodeL3(`${path}/${child.id}`) : null));*/
	const nodeChildrenL3 = GetNodeChildrenL3(nodeID, path, includeMirrorChildren, tagsToIgnore);
	/*if (applyAccessLevels) {
		nodeChildrenL3 = nodeChildrenL3.filter(child=>{
			// if null, keep (so receiver knows there's an entry here, but it's still loading)
			if (child == null) return true;
			// filter out any nodes whose access-level is higher than our own
			//if (child.current.accessLevel > GetUserAccessLevel(MeID())) return false;
			// hide nodes that don't have the required premise-count
			// if (!IsNodeVisibleToNonModNonCreators(child, GetNodeChildren(child)) && !IsUserCreatorOrMod(MeID(), child)) return false;
			return true;
		});
	}*/
	/*if (applyTimeline) {
		const playingTimeline = GetPlayingTimeline(mapID);
		const playingTimeline_currentStepIndex = GetPlayingTimelineStepIndex(mapID);
		// const playingTimelineShowableNodes = GetPlayingTimelineRevealNodes_All(map.id);
		// const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map.id, true);
		// if users scrolls to step X and expands this node, keep expanded even if user goes back to a previous step
		const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(mapID);
		if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
			// nodeChildrenToShow = nodeChildrenToShow.filter(child => playingTimelineVisibleNodes.Contains(`${path}/${child.id}`));
			// if this node (or a descendent) is marked to be revealed by a currently-applied timeline-step, reveal this node
			nodeChildrenL3 = nodeChildrenL3.filter(child=>child != null && playingTimelineVisibleNodes.Any(a=>a.startsWith(`${path}/${child.id}`)));
		}
	}*/
	return nodeChildrenL3;
});

/*export const GetCurrentRevision = CreateAccessor((nodeID: string, path: string, mapID: string|n): MapNodeRevision=>{
	const revisions = GetNodeRevisions(nodeID);
	// todo: make this take into account the "current lens", etc.
	return revisions.OrderBy(a=>a.createdAt).Last();
});*/