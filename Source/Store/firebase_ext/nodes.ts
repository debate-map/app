import {StoreAccessor} from "mobx-firelink";
import {GetPlayingTimeline, GetPlayingTimelineStepIndex, GetPlayingTimelineRevealNodes_UpToAppliedStep} from "Source/Store/main/maps/mapStates/$mapState";
import {emptyArray_forLoading} from "js-vextensions";
import {GetNodeChildrenL2} from "../../../Subrepos/Server/Source/@Shared/Store/firebase/nodes";
import {MapNodeL3} from "../../../Subrepos/Server/Source/@Shared/Store/firebase/nodes/@MapNode";
import {GetNodeL3} from "../../../Subrepos/Server/Source/@Shared/Store/firebase/nodes/$node";
import {GetUserAccessLevel} from "../../../Subrepos/Server/Source/@Shared/Store/firebase/users/$user";
import {MeID} from "../../../Subrepos/Server/Source/@Shared/Store/firebase/users";

export const GetNodeChildrenL3_Advanced = StoreAccessor(s=>(nodeID: string, path: string, mapID: string, includeMirrorChildren = true, tagsToIgnore?: string[], applyAccessLevels = false, applyTimeline = false, emptyForLoading = false): MapNodeL3[]=>{
	path = path || nodeID;

	const nodeChildrenL2 = GetNodeChildrenL2(nodeID, includeMirrorChildren, tagsToIgnore);
	let nodeChildrenL3 = nodeChildrenL2.map(child=>(child ? GetNodeL3(`${path}/${child._key}`) : null));
	if (applyAccessLevels) {
		nodeChildrenL3 = nodeChildrenL3.filter(child=>{
			// if null, keep (so receiver knows there's an entry here, but it's still loading)
			if (child == null) return true;
			// filter out any nodes whose access-level is higher than our own
			if (child.current.accessLevel > GetUserAccessLevel(MeID())) return false;
			// hide nodes that don't have the required premise-count
			// if (!IsNodeVisibleToNonModNonCreators(child, GetNodeChildren(child)) && !IsUserCreatorOrMod(MeID(), child)) return false;
			return true;
		});
	}
	if (applyTimeline) {
		const playingTimeline = GetPlayingTimeline(mapID);
		const playingTimeline_currentStepIndex = GetPlayingTimelineStepIndex(mapID);
		// const playingTimelineShowableNodes = GetPlayingTimelineRevealNodes_All(map._key);
		// const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map._key, true);
		// if users scrolls to step X and expands this node, keep expanded even if user goes back to a previous step
		const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(mapID);
		if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
			// nodeChildrenToShow = nodeChildrenToShow.filter(child => playingTimelineVisibleNodes.Contains(`${path}/${child._key}`));
			// if this node (or a descendent) is marked to be revealed by a currently-applied timeline-step, reveal this node
			nodeChildrenL3 = nodeChildrenL3.filter(child=>child != null && playingTimelineVisibleNodes.Any(a=>a.startsWith(`${path}/${child._key}`)));
		}
	}
	if (emptyForLoading) {
		nodeChildrenL3 = nodeChildrenL3.Any(a=>a == null) ? emptyArray_forLoading : nodeChildrenL3; // only pass nodeChildren when all are loaded
	}
	return nodeChildrenL3;
});