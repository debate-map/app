import chroma from "chroma-js";
import {GetNodeChildrenL3, GetNodeRevisions, MapNodeL3, MapNodeRevision, MapNodeType, Polarity} from "dm_common";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";

export function GetNodeColor(node: MapNodeL3, type: "raw" | "background" = "background"): chroma.Color {
	let result;
	if (node.type == MapNodeType.category) result = chroma("rgb(40,60,80)");
	else if (node.type == MapNodeType.package) result = chroma("rgb(30,120,150)");
	else if (node.type == MapNodeType.multiChoiceQuestion) result = chroma("rgb(90,50,180)");
	else if (node.type == MapNodeType.claim) result = chroma("rgb(0,80,150)");
	else if (node.type == MapNodeType.argument) {
		if (node.displayPolarity == Polarity.supporting) result = chroma("rgb(30,100,30)");
		else result = chroma("rgb(100,30,30)");
	}

	if (type == "background") {
		result = chroma.mix(result, "black", 0.3); // mix background-color with black some
		result = result.alpha(0.9);
	}

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