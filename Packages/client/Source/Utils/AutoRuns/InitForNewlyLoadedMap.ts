import {GetMap, GetNodeChildLinks, GetNodeL2, MapView} from "dm_common";
import {A, Assert, NN, Vector2} from "web-vcore/nm/js-vextensions.js";
import {autorun, runInAction} from "web-vcore/nm/mobx.js";
import {GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import {GetOpenMapID} from "Store/main";
import {ACTEnsureMapStateInit} from "Store/main/maps";
import {GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {TimelineSubpanel} from "Store/main/maps/mapStates/@MapState.js";
import {ACTMapNodeExpandedSet, GetNodeView, GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {ACTSetFocusNodeAndViewOffset, MapUI} from "UI/@Shared/Maps/MapUI.js";
import {JustBeforeUI_listeners} from "Main";
import {RunInAction} from "web-vcore";
import {AutoRun_HandleBail} from "./@Helpers.js";

let lastMapID;
AutoRun_HandleBail(()=>{
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
	//Assert(map);
	if (map == null) return; // map must be private/deleted

	// ACTEnsureMapStateInit(action.payload.id);
	// storeM.ACTEnsureMapStateInit(action.payload.id);
	let mapView: MapView|n;
	RunInAction("StartInitForNewlyLoadedMap_part1", ()=>{
		({mapState, mapView} = ACTEnsureMapStateInit(mapID));
		/*if (map.defaultTimelineID) {
			mapState.timelinePanelOpen = true;
			mapState.timelineOpenSubpanel = TimelineSubpanel.playing;
			mapState.selectedTimeline = map.defaultTimelineID;
		}*/
	});

	let pathsToExpand = [map.rootNode];
	for (let depth = 0; depth < map.defaultExpandDepth; depth++) {
		const newPathsToExpand = [] as string[];
		for (const path of pathsToExpand) {
			const nodeID = path.split("/").Last();
			const node = await GetAsync(()=>GetNodeL2(nodeID));
			//Assert(node);
			if (node == null) return; // node must be private/deleted

			// console.log('NodeView:', path, GetNodeView(map.id, path, false));
			if (GetNodeView(map.id, path, false) == null) {
				// console.log('Expanding:', path);
				ACTMapNodeExpandedSet({mapID: map.id, path, expanded: true, resetSubtree: false});
			}
			const childLinks = await GetAsync(()=>GetNodeChildLinks(node.id));
			if (childLinks.length) {
				newPathsToExpand.push(...childLinks.map(a=>`${path}/${a.child}`));
			}
		}
		pathsToExpand = newPathsToExpand;
	}

	// have view start a bit to the right of the root node
	ACTSetFocusNodeAndViewOffset(mapID, map.rootNode, new Vector2(300, 0));

	RunInAction("StartInitForNewlyLoadedMap_markInitDone", ()=>NN(mapState).initDone = true);

	// probably temp (find more elegant way)
	const mapUI = MapUI.CurrentMapUI;
	// console.log('MapUI:', mapUI);
	if (mapUI) {
		mapUI.StartLoadingScroll();
	}
}