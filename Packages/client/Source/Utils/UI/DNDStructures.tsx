import {ChildGroup} from "dm_common";
import {UUID} from "web-vcore/nm/mobx-graphlink.js";

export class DroppableInfo {
	constructor(data: Partial<DroppableInfo>) {
		Object.assign(this, data);
	}
	type: "NodeChildHolder" | "TimelineStepList" | "TimelineStepNodeRevealList";

	// if NodeChildHolder
	parentPath?: string;
	childGroup?: ChildGroup;
	subtype?: "up" | "down";
	childIDs?: UUID[];

	// if TimelineStepList or TimelineStepNodeRevealList
	timelineID?: string|n;

	// if TimelineStepNodeRevealList
	stepID?: string;
}
export class DraggableInfo {
	constructor(initialData: Partial<DraggableInfo>) {
		this.VSet(initialData);
	}

	// if NodeL1 (in NodeChildHolder)
	mapID?: UUID;
	nodePath?: string;

	// if TimelineStep (in TimelineStepList)
	stepID?: string;
}

// example usage
// ==========

/*
const ListUI = ()=>{
	return (
		<div>
		</div>
	);
};
const ItemUI = ()=>{
	return (
		<div>
		</div>
	);
};
*/