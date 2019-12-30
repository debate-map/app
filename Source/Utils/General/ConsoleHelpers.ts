import {GetPlayingTimeline, GetSelectedTimeline} from "Store/main/maps/mapStates/$mapState";
import {GetOpenMapID} from "Store/main";
import {GetTimelineSteps} from "Store/firebase/timelineSteps";
import {GetAsync, MergeDBUpdates} from "mobx-firelink";
import {Clone, ToNumber} from "js-vextensions";
import {NodeReveal} from "Store/firebase/timelineSteps/@TimelineStep";
import {GetNodeL2} from "Store/firebase/nodes/$node";

// temp (for in-console db-upgrades and such)
// ==========

/* export async function GetDBUpdatesFor_TimelineStepNodeRevealsAddShowProp() {
	const timeline = await GetAsync(() => GetSelectedTimeline(GetOpenMapID()));
	const steps = await GetAsync(() => GetTimelineSteps(timeline));
	const dbUpdateSets = steps.map((step) => {
		if (ToNumber(step.nodeReveals?.length, 0) == 0) return {};
		const newNodeReveals = step.nodeReveals.map((oldReveal) => {
			const newReveal = Clone(oldReveal) as NodeReveal;
			newReveal.show = true;
			return newReveal;
		});
		return {
			[`timelineSteps/${step._key}/.nodeReveals`]: newNodeReveals,
		};
	});
	let mergedDBUpdates = {};
	for (const updateSet of dbUpdateSets) {
		mergedDBUpdates = MergeDBUpdates(mergedDBUpdates, updateSet);
	}
	return mergedDBUpdates;
} */

export async function GetDBUpdatesFor_MakeNodesPrivate_Recursive(mapID: string, nodeID: string, runInfo = {nodesVisited: new Set<string>()}) {
	if (runInfo.nodesVisited.has(nodeID)) return;
	runInfo.nodesVisited.add(nodeID);
	const node = await GetAsync(()=>GetNodeL2(nodeID));

	let dbUpdates = {};
	// if (node.ownerMapID != mapID) {
	if (node.ownerMapID == null) {
		dbUpdates[`nodes/${nodeID}/.ownerMapID`] = mapID;
	}
	if (node.children) {
		for (const childID of node.children.VKeys()) {
			dbUpdates = MergeDBUpdates(dbUpdates, await GetDBUpdatesFor_MakeNodesPrivate_Recursive(mapID, childID));
		}
	}
	return dbUpdates;
}