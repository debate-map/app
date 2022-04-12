import {DeleteNodeSubtree, GetMaps, GetNodeL2, UpdateMapDetails} from "dm_common";
import {E} from "web-vcore/nm/js-vextensions.js";

/*
Basic db-upgrade procedure:
1) Retrieve list of db-updates by running "dbUpdates = await RR().GetDBUpdatesFor_XXX()" for the target function below, from console.
2) Make "quick backup" of the data at the paths where those db-updates will be applied, using: RR.MakeQuickBackupForDBUpdates({}, dbUpdates)
3) Check the quick-backup file downloaded to your computer, to make sure the old and new values look correct.
4) Apply the given db-updates by running: RR.ApplyDBUpdates({}, dbUpdates)

Reminders:
* For large updates, usually perform process on subset of data before doing whole thing.
*/

// helpers
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
			[`timelineSteps/${step.id}/.nodeReveals`]: newNodeReveals,
		};
	});
	let mergedDBUpdates = {};
	for (const updateSet of dbUpdateSets) {
		mergedDBUpdates = MergeDBUpdates(mergedDBUpdates, updateSet);
	}
	return mergedDBUpdates;
} */

/*export async function GetDBUpdatesFor_MediaRefactor() {
	const revsWithImg = await GetAsync(()=>GetDocs({
		queryOps: [new WhereOp("image.id", ">", "")],
	}, a=>a.nodeRevisions));

	const images = await GetAsync(()=>GetDocs({}, (a: any)=>a.images));

	const dbUpdates_revs = MergeDBUpdates_Multi(...revsWithImg.map(rev=> {
		const img = images.find(a=>a.id == rev["image"].id);
		return {
			[`nodeRevisions/${rev.id}`]: EV(rev, {
				image: DEL,
				media: EV(rev["image"], {previewWidth: img ? OmitIfNull(img.previewWidth) : OMIT, sourceChains: img ? img.sourceChains : OMIT, captured: img && img.type == 20 ? true : OMIT}),
			}),
		};
	}));

	const dbUpdates_images = MergeDBUpdates_Multi(...images.map(img=> {
		return {
			[`images/${img.id}`]: null,
			[`medias/${img.id}`]: EV(img, {
				previewWidth: DEL,
				sourceChains: DEL,
				type: 10,
			}),
		};
	}));

	const dbUpdates = MergeDBUpdates_Multi(dbUpdates_revs, dbUpdates_images);

	StoreTempData({revsWithImg, images, dbUpdates_revs, dbUpdates_images, dbUpdates});
	return dbUpdates;
}*/