import {UUID} from "web-vcore/nm/mobx-graphlink";

export class DroppableInfo {
	constructor(data: Partial<DroppableInfo>) {
		this.VSet(data);
	}
	type: "NodeChildHolder" | "TimelineStepList" | "TimelineStepNodeRevealList";

	// if NodeChildHolder
	parentPath?: string;
	subtype?: "up" | "down";
	childIDs?: UUID[];

	// if TimelineStepList
	timelineID?: string;

	// if TimelineStepNodeRevealList
	stepID?: string;
}
export class DraggableInfo {
	constructor(initialData: Partial<DraggableInfo>) {
		this.VSet(initialData);
	}

	// if MapNode (in NodeChildHolder)
	mapID?: UUID;
	nodePath?: string;

	// if TimelineStep (in TimelineStepList)
	stepID?: string;
}