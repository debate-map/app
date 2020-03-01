import {GetNodeL3, WeightingType} from "@debate-map/server-link/Source/Link";
import {observable} from "mobx";
import {StoreAccessor} from "mobx-firelink";
import {ignore} from "mobx-sync";
import {store} from "Source/Store";
import {O, StoreAction} from "vwebapp-framework";
import {MapState} from "./maps/mapStates/@MapState";
import {GetMapView, MapView} from "./maps/mapViews/$mapView";

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
	@O mapViews = observable.map<string, MapView>();

	@O nodeLastAcknowledgementTimes = observable.map<string, number>();
	@O @ignore currentNodeBeingAdded_path: string;

	// openMap: number;

	@O copiedNodePath: string;
	@O copiedNodePath_asCut: boolean;

	@O lockMapScrolling = true;
	@O initialChildLimit = 5;
	@O showReasonScoreValues = false;
	@O weighting = WeightingType.Votes;

	// node panels
	@O detailsPanel = new DetailsPanelState();
	@O addChildDialog = new AddChildDialogState();
	@O exportSubtreeDialog = new ExportSubtreeDialogState();
	@O importSubtreeDialog = new ImportSubtreeDialogState();
}

export enum DetailsPanel_Subpanel {
	Text = 10,
	Attachment = 20,
	Permissions = 30,
	Others = 40,
}
export class DetailsPanelState {
	@O subpanel = DetailsPanel_Subpanel.Text;
}

export class AddChildDialogState {
	@O advanced = false;
}

export enum DataExchangeFormat {
	//DebateMap_JSON = 10,
	//CD_JSON = 20,
	GAD_CSV = 30,
}
export class ExportSubtreeDialogState {
	@O targetFormat = DataExchangeFormat.GAD_CSV;
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