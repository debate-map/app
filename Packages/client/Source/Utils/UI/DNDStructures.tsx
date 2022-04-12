import {ChildGroup} from "dm_common";
import {UUID} from "web-vcore/nm/mobx-graphlink.js";
import {DraggableProvided, DraggableStateSnapshot} from "web-vcore/nm/react-beautiful-dnd";

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