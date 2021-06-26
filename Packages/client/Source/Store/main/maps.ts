import {GetNodeL3, WeightingType, MapView} from "dm_common";
import {observable} from "web-vcore/nm/mobx";
import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {ignore, version} from "web-vcore/nm/mobx-sync";
import {store} from "Store";
import {O, StoreAction} from "web-vcore";
import {MapState} from "./maps/mapStates/@MapState";
import {GetMapView} from "./maps/mapViews/$mapView";
import {CreateStringEnum} from "web-vcore/nm/js-vextensions";

export class MapsState {
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
	@O @ignore currentNodeBeingAdded_path: string;

	// openMap: number;

	@O copiedNodePath: string;
	@O copiedNodePath_asCut: boolean;

	@O lockMapScrolling = true;
	@O initialChildLimit = 5;
	@O showReasonScoreValues = false;
	@O weighting = WeightingType.votes;

	// node panels
	@O detailsPanel = new DetailsPanelState();
	@O addChildDialog = new AddChildDialogState();
	@O exportSubtreeDialog = new ExportSubtreeDialogState();
	@O importSubtreeDialog = new ImportSubtreeDialogState();
}

export const [DetailsPanel_Subpanel] = CreateStringEnum({
	text: 1,
	attachment: 1,
	permissions: 1,
	others: 1,
});
export type DetailsPanel_Subpanel = keyof typeof DetailsPanel_Subpanel;
export class DetailsPanelState {
	@O subpanel = DetailsPanel_Subpanel.text;
}

export class AddChildDialogState {
	@O advanced = false;
}

export const [DataExchangeFormat] = CreateStringEnum({
	//debateMap_json: 1,
	//cd_json: 1,
	gad_csv: 1,
});
export type DataExchangeFormat = keyof typeof DataExchangeFormat;
export class ExportSubtreeDialogState {
	@O targetFormat = DataExchangeFormat.gad_csv;
	@O baseExportDepth = 5;
}
export class ImportSubtreeDialogState {
	@O importRatings = false;
	@O importRatings_userIDsStr = "";
}

export const GetLastAcknowledgementTime = StoreAccessor(s=>(nodeID: string)=>{
	return s.main.maps.nodeLastAcknowledgementTimes.get(nodeID) || 0;
});

/* export const GetLastAcknowledgementTime2 = StoreAccessor((nodeID: string) => {
	GetCopiedNodePath();
	return State('main', 'nodeLastAcknowledgementTimes', nodeID) as number || 0;
}); */

export const GetCopiedNodePath = StoreAccessor(s=>()=>{
	return s.main.maps.copiedNodePath;
});
export const GetCopiedNode = StoreAccessor(s=>()=>{
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
export const ACTCopyNode = StoreAction((path: string, asCut: boolean, broadcastToOtherTabs = true)=>{
	store.main.maps.copiedNodePath = path;
	store.main.maps.copiedNodePath_asCut = asCut;
	if (broadcastToOtherTabs) {
		ACTCopyNode_broadcastChannel.postMessage({path, asCut});
	}
});