import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {O} from "web-vcore";

export enum ShareTab {
	AllMaps = 10,
	ThisMap = 20,
	Current = 30,
}
export enum ExpandType {
	//MapDefault = 10,
	//ToSelectedNode = 20,
	MatchView = 30,
}
export enum ScrollToType {
	//MapRoot = 10,
	//SelectedNode = 20,
	ViewCenter = 30,
}

export class ShareUIState {
	@O tab = ShareTab.Current;

	// for new share
	@O expandType = ExpandType.MatchView;
	@O scrollToType = ScrollToType.ViewCenter;
	@O showJSON = false;
}