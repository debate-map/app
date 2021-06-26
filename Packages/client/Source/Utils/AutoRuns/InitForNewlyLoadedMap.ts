import {GetMap, GetNodeL2, MapView} from "dm_common";
import {Assert, Vector2} from "web-vcore/nm/js-vextensions";
import {autorun, runInAction} from "web-vcore/nm/mobx";
import {GetAsync} from "web-vcore/nm/mobx-graphlink";
import {GetOpenMapID} from "Store/main";
import {ACTEnsureMapStateInit} from "Store/main/maps";
import {GetMapState} from "Store/main/maps/mapStates/$mapState";
import {TimelineSubpanel} from "Store/main/maps/mapStates/@MapState";
import {ACTMapNodeExpandedSet, GetNodeView, GetMapView} from "Store/main/maps/mapViews/$mapView";
import {ACTSetFocusNodeAndViewOffset, MapUI} from "UI/@Shared/Maps/MapUI";

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
	if (mapState?.initDone && GetMapView(mapID) != null) return; // 2nd-check for version-clearing
	const map = await GetAsync(()=>GetMap(mapID));

	// ACTEnsureMapStateInit(action.payload.id);
	// storeM.ACTEnsureMapStateInit(action.payload.id);
	let mapView: MapView;
	runInAction("StartInitForNewlyLoadedMap_part1", ()=>{
		({mapState, mapView} = ACTEnsureMapStateInit(mapID));
		if (map.defaultTimelineID) {
			mapState.timelinePanelOpen = true;
			mapState.timelineOpenSubpanel = TimelineSubpanel.playing;
			mapState.selectedTimeline = map.defaultTimelineID;
		}
	});

	let pathsToExpand = [map.rootNode];
	for (let depth = 0; depth < map.defaultExpandDepth; depth++) {
		const newPathsToExpand = [];
		for (const path of pathsToExpand) {
			const nodeID = path.split("/").Last();
			const node = await GetAsync(()=>GetNodeL2(nodeID));
			// console.log('NodeView:', path, GetNodeView(map.id, path, false));
			if (GetNodeView(map.id, path, false) == null) {
				// console.log('Expanding:', path);
				ACTMapNodeExpandedSet({mapID: map.id, path, expanded: true, resetSubtree: false});
			}
			if (node.children) {
				newPathsToExpand.push(...node.children.VKeys().map(childID=>`${path}/${childID}`));
			}
		}
		pathsToExpand = newPathsToExpand;
	}

	// have view start a bit to the right of the root node
	ACTSetFocusNodeAndViewOffset(mapID, map.rootNode, new Vector2(300, 0));

	runInAction("StartInitForNewlyLoadedMap_markInitDone", ()=>mapState.initDone = true);

	// probably temp (find more elegant way)
	const mapUI = MapUI.CurrentMapUI;
	// console.log('MapUI:', mapUI);
	if (mapUI) {
		mapUI.StartLoadingScroll();
	}
}