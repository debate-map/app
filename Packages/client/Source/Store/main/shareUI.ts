import {CreateAccessor} from "mobx-graphlink";
import {O} from "web-vcore";
import {CreateStringEnum} from "js-vextensions";

export enum ShareTab {
	allMaps = "allMaps",
	thisMap = "thisMap",
	current = "current",
}
export enum ExpandType {
	//mapDefault: 1,
	//toSelectedNode: 1,
	matchView = "matchView",
}
export enum ScrollToType {
	//mapRoot: 1,
	//selectedNode: 1,
	viewCenter = "viewCenter",
}

export class ShareUIState {
	@O accessor tab = ShareTab.current;

	// for new share
	@O accessor expandType = ExpandType.matchView;
	@O accessor scrollToType = ScrollToType.viewCenter;
	@O accessor showJSON = false;
}