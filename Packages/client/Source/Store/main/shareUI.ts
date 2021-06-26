import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {O} from "web-vcore";
import {CreateStringEnum} from "web-vcore/nm/js-vextensions";

export const [ShareTab] = CreateStringEnum({
	allMaps: 1,
	thisMap: 1,
	current: 1,
});
export type ShareTab = keyof typeof ShareTab;
export const [ExpandType] = CreateStringEnum({
	//mapDefault: 1,
	//toSelectedNode: 1,
	matchView: 1,
});
export type ExpandType = keyof typeof ExpandType;
export const [ScrollToType] = CreateStringEnum({
	//mapRoot: 1,
	//selectedNode: 1,
	viewCenter: 1,
});
export type ScrollToType = keyof typeof ScrollToType;

export class ShareUIState {
	@O tab = ShareTab.current;

	// for new share
	@O expandType = ExpandType.matchView;
	@O scrollToType = ScrollToType.viewCenter;
	@O showJSON = false;
}