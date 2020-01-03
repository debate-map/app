import {observable} from "mobx";
import {ignore} from "mobx-sync";
import {WeightingType} from "Store/main";
import {O, StoreAction} from "vwebapp-framework";
import {store} from "Store";
import {StoreAccessor} from "mobx-firelink";
import {GetNodeL3} from "Store/firebase/nodes/$node";
import {DetailsPanel_Subpanel} from "UI/@Shared/Maps/MapNode/NodeUI/Panels/DetailsPanel";
import {MapView, GetMapView} from "./maps/mapViews/$mapView";
import {MapState} from "./maps/mapStates/@MapState";

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
}
export class DetailsPanelState {
	@O subpanel = DetailsPanel_Subpanel.Content;
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