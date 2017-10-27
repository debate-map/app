import {SortType} from "./$map";

export class MapInfo {
	list_sortBy: SortType;
	list_filter: string;
	list_page: number;
	list_selectedNodeID: number;
	list_selectedNode_openPanel: string;
	selectedTimeline: number;
	playingTimeline: number;
	playingTimeline_step: number;
	playingTimeline_appliedStep: number;
}