import {autorun, runInAction} from "mobx";
import {GetOpenMapID} from "Source/Store/main";
import {GetNodeView, ACTMapNodeExpandedSet, MapView, MapNodeView} from "Source/Store/main/maps/mapViews/$mapView";
import {store} from "Source/Store";
import {GetAsync} from "mobx-firelink";
import {Assert, Vector2i} from "js-vextensions";
import {MapState, TimelineSubpanel} from "Source/Store/main/maps/mapStates/@MapState";
import {MapUI, ACTUpdateFocusNodeAndViewOffset, ACTSetFocusNodeAndViewOffset} from "Source/UI/@Shared/Maps/MapUI";
import {GetMapState} from "Source/Store/main/maps/mapStates/$mapState";
import {ACTEnsureMapStateInit} from "Source/Store/main/maps";
import {GetMap} from "@debate-map/server-link/Source/Link";
import {GetNodeL2} from "@debate-map/server-link/Source/Link";

let lastMapID;
autorun(()=>{
	const mapID = GetOpenMapID();
	if (mapID != lastMapID) {
		lastMapID = mapID;
		if (mapID) {
			StartInitForNewlyLoadedMap(mapID);
		}
	}
}, {name: "InitForNewlyLoadedMap"});

async function StartInitForNewlyLoadedMap(mapID: string) {
	Assert(mapID != null, "mapID cannot be null.");
	let mapState = GetMapState(mapID);
	if (mapState?.initDone) return;
	const map = await GetAsync(()=>GetMap(mapID));

	// ACTEnsureMapStateInit(action.payload.id);
	// storeM.ACTEnsureMapStateInit(action.payload.id);
	let mapView: MapView;
	runInAction("StartInitForNewlyLoadedMap_part1", ()=>{
		({mapState, mapView} = ACTEnsureMapStateInit(mapID));
		if (map.defaultTimelineID) {
			mapState.timelinePanelOpen = true;
			mapState.timelineOpenSubpanel = TimelineSubpanel.Playing;
			mapState.selectedTimeline = map.defaultTimelineID;
		}
	});

	let pathsToExpand = [map.rootNode];
	for (let depth = 0; depth < map.defaultExpandDepth; depth++) {
		const newPathsToExpand = [];
		for (const path of pathsToExpand) {
			const nodeID = path.split("/").Last();
			const node = await GetAsync(()=>GetNodeL2(nodeID));
			// console.log('NodeView:', path, GetNodeView(map._key, path, false));
			if (GetNodeView(map._key, path, false) == null) {
				// console.log('Expanding:', path);
				ACTMapNodeExpandedSet({mapID: map._key, path, expanded: true, resetSubtree: false});
			}
			if (node.children) {
				newPathsToExpand.push(...node.children.VKeys().map(childID=>`${path}/${childID}`));
			}
		}
		pathsToExpand = newPathsToExpand;
	}

	// have view start a bit to the right of the root node
	ACTSetFocusNodeAndViewOffset(mapID, map.rootNode, new Vector2i(300, 0));

	runInAction("StartInitForNewlyLoadedMap_markInitDone", ()=>mapState.initDone = true);

	// probably temp (find more elegant way)
	const mapUI = MapUI.CurrentMapUI;
	// console.log('MapUI:', mapUI);
	if (mapUI) {
		mapUI.StartLoadingScroll();
	}
}