import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {O} from "web-vcore";
import {CreateStringEnum} from "web-vcore/nm/js-vextensions";

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
	@O tab = ShareTab.current;

	// for new share
	@O expandType = ExpandType.matchView;
	@O scrollToType = ScrollToType.viewCenter;
	@O showJSON = false;
}