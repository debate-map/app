import {GetNodeL3, WeightingType, MapView} from "dm_common";
import {makeObservable, observable} from "web-vcore/nm/mobx.js";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {ignore, version} from "web-vcore/nm/mobx-sync.js";
import {store} from "Store";
import {O, StoreAction} from "web-vcore";
import {CreateStringEnum} from "web-vcore/nm/js-vextensions.js";
import {DataExchangeFormat, ImportResource} from "Utils/DataFormats/DataExchangeFormat.js";
import {MapState} from "./maps/mapStates/@MapState.js";
import {GetMapView} from "./maps/mapViews/$mapView.js";

export enum RatingPreviewType {
	none = "none",
	bar_average = "bar_average",
	//bar_median = "bar_median",
	chart = "chart",
}

export class MapsState {
	constructor() { makeObservable(this); }
	// @Oervable maps = observable.map<string, MapState>();
	// @ref(MapState_) maps = {} as {[key: string]: MapState};
	// @map(MapState_) maps = observable.map<string, MapState>();
	// @O maps = {} as ObservableMap<string, MapState>;
	@O mapStates = observable.map<string, MapState>();
	/* ACTEnsureMapStateInit(mapID: string) {
		if (this.maps.get(mapID)) return;
		this.maps.set(mapID, new MapState());
	} */
	@O @version(2) mapViews = observable.map<string, MapView>();

	@O nodeLastAcknowledgementTimes = observable.map<string, number>();
	@O @ignore currentNodeBeingAdded_path: string|n;

	// openMap: number;

	@O copiedNodePath: string|n;
	@O copiedNodePath_asCut: boolean;

	@O lockMapScrolling = true;
	@O initialChildLimit = 5;
	@O showReasonScoreValues = false;
	@O toolbarRatingPreviews = RatingPreviewType.chart;
	@O @version(2) weighting = WeightingType.date;
	//@O nodeLeftBoxEnabled = false;

	// node panels
	@O detailsPanel = new DetailsPanelState();
	@O tagsPanel = new TagsPanelState();
	@O addChildDialog = new AddChildDialogState();
	@O importSubtreeDialog = new ImportSubtreeDialogState();
	@O exportSubtreeDialog = new ExportSubtreeDialogState();
}

export enum DetailsPanel_Subpanel {
	text = "text",
	attachment = "attachment",
	permissions = "permissions",
	others = "others",
}
export class DetailsPanelState {
	constructor() { makeObservable(this); }
	@O subpanel = DetailsPanel_Subpanel.text;
}

export enum TagsPanel_Subpanel {
	"basic" = "basic",
	"advanced" = "advanced",
}
export class TagsPanelState {
	constructor() { makeObservable(this); }
	@O subpanel = TagsPanel_Subpanel.basic;
}

export class AddChildDialogState {
	constructor() { makeObservable(this); }
	@O advanced = false;
}

export class ImportSubtreeDialogState {
	constructor() { makeObservable(this); }

	@O sourceType = DataExchangeFormat.csv_sl;
	@O autoSearchByTitle = true;
	@O showAutoInsertTools = true;
	//@O hideFoundEntries = false;

	@O @ignore selectedImportResources = new Set<ImportResource>();
	@O @ignore selectFromIndex = -1;

	/*@O importRatings = false;
	@O importRatings_userIDsStr = "";*/
}

export class ExportSubtreeDialogState {
	constructor() { makeObservable(this); }
	@O targetFormat = DataExchangeFormat.json_dm;
	@O maxExportDepth = 5;
}

export const GetLastAcknowledgementTime = CreateAccessor(function(nodeID: string) {
	return this!.store.main.maps.nodeLastAcknowledgementTimes.get(nodeID) || 0;
});

/* export const GetLastAcknowledgementTime2 = StoreAccessor((nodeID: string) => {
	GetCopiedNodePath();
	return State('main', 'nodeLastAcknowledgementTimes', nodeID) as number || 0;
}); */

export const GetCopiedNodePath = CreateAccessor(function() {
	return this!.store.main.maps.copiedNodePath;
});
export const GetCopiedNode = CreateAccessor(()=>{
	const path = GetCopiedNodePath();
	if (!path) return null;
	return GetNodeL3(path);
});

// actions
// ==========

export const ACTEnsureMapStateInit = StoreAction((mapID: string)=>{
	if (!store.main.maps.mapStates.has(mapID)) {
		store.main.maps.mapStates.set(mapID, new MapState());
	}
	if (GetMapView(mapID) == null) {
		store.main.maps.mapViews.set(mapID, new MapView());
		store.main.maps.mapViews.get(mapID)!.rootNodeViews = {}; // for some reason this is needed
	}
	return {
		mapState: store.main.maps.mapStates.get(mapID),
		mapView: GetMapView(mapID),
	};
});

// the broadcast-channel allows us to easily replicate the node-copy operation in other tabs, enabling easy copy-paste between tabs
var ACTCopyNode_broadcastChannel = new BroadcastChannel("ACTCopyNode_broadcastChannel");
ACTCopyNode_broadcastChannel.onmessage = (ev: MessageEvent)=>{
	const {path, asCut} = ev.data as {path: string, asCut: boolean};
	ACTCopyNode(path, asCut, false);
};
export const ACTCopyNode = StoreAction((path: string|n, asCut: boolean, broadcastToOtherTabs = true)=>{
	store.main.maps.copiedNodePath = path;
	store.main.maps.copiedNodePath_asCut = asCut;
	if (broadcastToOtherTabs) {
		ACTCopyNode_broadcastChannel.postMessage({path, asCut});
	}
});