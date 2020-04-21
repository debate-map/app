import {GetPlayingTimeline, GetSelectedTimeline} from "Store/main/maps/mapStates/$mapState";
import {GetOpenMapID} from "Store/main";
import {GetAsync, MergeDBUpdates, GetDocs, WhereOp, MergeDBUpdates_Multi} from "mobx-firelink";
import {Clone, ToNumber, DEL, E, OmitIfNull, OMIT} from "js-vextensions";
import {GetNodeL2} from "@debate-map/server-link/Source/Link";
import {DeleteNodeSubtree} from "@debate-map/server-link/Source/Link";

export function StoreTempData(data: Object) {
	g.tempData = g.tempData || [];
	g.tempData.push(E({_time: Date.now()}, data));
}

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

export async function GetDBUpdatesFor_DeleteNodeSubtree(nodeID: string, maxDeletes: number, maxIterations?: number) {
	maxIterations = maxIterations ?? maxDeletes * 10; // there shouldn't be more than about 10 mobx-loops per node-delete

	const command = new DeleteNodeSubtree({nodeID, maxDeletes});
	await command.Validate_Async({maxIterations});
	return command.GetDBUpdates();
}

export async function GetDBUpdatesFor_MediaRefactor() {
	const revsWithImg = await GetAsync(()=>GetDocs({
		queryOps: [new WhereOp("image.id", ">", "")],
	}, a=>a.nodeRevisions));

	const images = await GetAsync(()=>GetDocs({}, (a: any)=>a.images));

	const dbUpdates_revs = MergeDBUpdates_Multi(...revsWithImg.map(rev=> {
		const img = images.find(a=>a._key == rev["image"].id);
		return {
			[`nodeRevisions/${rev._key}`]: E(rev, {
				image: DEL,
				media: E(rev["image"], {previewWidth: img ? OmitIfNull(img.previewWidth) : OMIT, sourceChains: img ? img.sourceChains : OMIT, captured: img && img.type == 20 ? true : OMIT}),
			}),
		};
	}));

	const dbUpdates_images = MergeDBUpdates_Multi(...images.map(img=> {
		return {
			[`images/${img._key}`]: null,
			[`medias/${img._key}`]: E(img, {
				previewWidth: DEL,
				sourceChains: DEL,
				type: 10,
			}),
		};
	}));

	const dbUpdates = MergeDBUpdates_Multi(dbUpdates_revs, dbUpdates_images);

	StoreTempData({revsWithImg, images, dbUpdates_revs, dbUpdates_images, dbUpdates});
	return dbUpdates;
}