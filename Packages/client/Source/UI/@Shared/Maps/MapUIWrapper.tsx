import {DoesMapPolicyGiveMeAccess_ExtraCheck, GetMap, GetNodeL3, IsNodeL2, IsNodeL3, NodeL3} from "dm_common";
import React, {useMemo, useState} from "react";
import {store} from "Store/index.js";
import {GetMapState, GetTimelinePanelOpen} from "Store/main/maps/mapStates/$mapState.js";
import {GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {ShowHeader} from "UI/@SL/SL.js";
import {ES, HTMLProps, UseWindowEventListener} from "web-vcore";
import {Assert} from "js-vextensions";
import {Column, Row} from "react-vcomponents";
import {GetPlaybackInfo} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {GetPlaybackTimeTrackerState} from "Store/main/maps/mapStates/PlaybackAccessors/ForEffects.js";
import {TimelinePanel} from "../Timelines/TimelinePanel.js";
import {useGraph} from "./MapGraph.js";
import {MapUI} from "./MapUI.js";
import {ActionBar_Left, actionBarHeight} from "./MapUI/ActionBar_Left.js";
import {ActionBar_Right} from "./MapUI/ActionBar_Right.js";
import {NodeUI_ForBots} from "./Node/NodeUI_ForBots.js";
import {TimelineEffectApplier_Smooth} from "./MapUI/TimelineEffectApplier_Smooth.js";
import {TimeTrackerUI} from "./MapUI/TimeTrackerUI.js";
import {observer_mgl} from "mobx-graphlink";

export const MapUIWaitMessage = ({message}:{message: string})=>{
	return (
		<div style={ES({
			display: "flex", alignItems: "center", justifyContent: "center", flex: 1, fontSize: 25,
			color: "white",
			textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
		})}>
			{message}
		</div>
	);
};

export type Padding = {
	left: number,
	right: number,
	top: number,
	bottom: number
};

export type MapUIWrapperProps = {
	mapID: string, rootNode?: NodeL3,
	withinPage?: boolean, padding?: Padding,
} & HTMLProps<"div">;

export const MapUIWrapper = observer_mgl((props: MapUIWrapperProps)=>{
	const {mapID, rootNode: rootNode_passed, withinPage, padding} = props;

	(function ValidateProps() {
	    const rootNode = rootNode_passed;
	    if (rootNode) {
	        Assert(IsNodeL2(rootNode), "Node supplied to MapUI is not level-2!");
	        Assert(IsNodeL3(rootNode), "Node supplied to MapUI is not level-3!");
	    }
	})();
	Assert(mapID, "mapID is null!");

	const getMapUIPadding = (): Padding=>{
		if (padding) return padding;
		if (store.main.maps.screenshotMode) return {left: 100, right: 100, top: 100, bottom: 100};

		const winWidth = window.innerWidth;
		const winHeight = window.innerHeight - 45 - 30; // exclude the nav-bar and sub-nav-bar

		// if header hidden, we're probably in iframe, so adjust padding to be a lot smaller
		// (large paddings are confusing in small viewport)
		const mult = ShowHeader ? .9 : .3;
		return {left: winWidth * mult, right: winWidth * mult, top: winHeight * mult, bottom: winHeight * mult};
	};

	const [containerPadding, setContainerPadding] = useState<Padding>(()=>getMapUIPadding());
	UseWindowEventListener("resize", ()=>{
		setContainerPadding(getMapUIPadding());
	});

	// graphs
	const graph_forLayoutHelper = useGraph(true, null);
	const graph_main = useGraph(false, graph_forLayoutHelper);

	// map fetch + access checks
	const map = GetMap(mapID);
	if (map == null) return <MapUIWaitMessage message="Map is private/deleted." />;

	// defensive; in case something goes wrong with the server-side permission-enforcing, do a basic check here as well
	if (!DoesMapPolicyGiveMeAccess_ExtraCheck(mapID)) return <MapUIWaitMessage message="Map is private/deleted."/>;

	const mapState = GetMapState(mapID);
	if (!mapState?.initDone) return <MapUIWaitMessage message="Initializing map metadata..." />;

	// update some graph info
	graph_main.containerPadding = containerPadding;
	graph_forLayoutHelper.containerPadding = containerPadding;

	const mapView = GetMapView(mapID);
	if (mapView == null) return <MapUIWaitMessage message="Initializing map view..." />;

	const rootNode = useMemo(()=>{
		let result: NodeL3 | null | undefined = rootNode_passed;
		if (result == null && map && map.rootNode) {
		    result = GetNodeL3(`${map.rootNode}`);
		}
		if (isBot && map) {
		    const nodeID = mapView?.bot_currentNodeID;
		    if (nodeID) result = GetNodeL3(`${nodeID}`);
		}
		return result ?? null;
	}, [rootNode_passed, map, mapView]);

	if (rootNode == null) return <MapUIWaitMessage message="Map's content is private/deleted."/>;

	// bot-only path
	if (isBot) {
		return <NodeUI_ForBots map={map} node={rootNode}/>;
	}

	// ui state
	const uiState = store.main.timelines;
	const timelinePanelOpen = map ? GetTimelinePanelOpen(map.id) : null;
	const playback = GetPlaybackInfo();
	const timeTrackerVisible = mapState.playingTimeline_time != null ? GetPlaybackTimeTrackerState() : false;

	const subNavBarWidth = 0;
	const actionBarHeight_final = ShowHeader ? actionBarHeight : 0;

	return (
		<Column style={ES({flex: 1})}>
			{!withinPage && ShowHeader && (
				<>
					<ActionBar_Left map={map} subNavBarWidth={subNavBarWidth}/>
					<ActionBar_Right map={map} subNavBarWidth={subNavBarWidth}/>
				</>
			)}
			<Row style={{
				position: "relative", // needed for TimelinePanel->AudioPanel to be positioned correctly
				marginTop: actionBarHeight_final, height: `calc(100% - ${actionBarHeight_final}px)`, alignItems: "flex-start",
			}}>
				{!withinPage && timelinePanelOpen && <TimelinePanel map={map}/>}
				<div
					className={[
						// disable all mouse interactions with the map-ui container, when recording
						store.main.timelines.recordPanel.recording && "clickThroughChain",
					].filter(a=>a).join(" ")}
					style={ES(
						{position: "relative", flex: 1, minWidth: 0, height: "100%"},
						store.main.timelines.recordPanel.lockedMapSize && {
							flex: null,
							width: store.main.timelines.recordPanel.lockedMapSize_x,
							height: store.main.timelines.recordPanel.lockedMapSize_y,
							border: "solid 5px red", boxSizing: "content-box",
						},
					)}
				>
					{playback?.timeline != null && timeTrackerVisible && <TimeTrackerUI map={map}/>}
					<MapUI {...{mapID, map, mapState, mapView, rootNode}} graphInfo={graph_main}/>
					{playback?.timeline && uiState.layoutHelperMap_load && <>
						<TimelineEffectApplier_Smooth {...{map, mapState}} mainGraph={graph_main} layoutHelperGraph={graph_forLayoutHelper}/>
						<div
							className={[
								!uiState.layoutHelperMap_show && "hideAndCompletelyBlockMouseEvents",
							].filter(a=>a).join(" ")}
							style={ES(
								{position: "absolute", left: 0, top: 0, right: 0, bottom: 0 /*zIndex: 1*/},
								// Even though class styles result in hiding, the positioning of the map causes chrome slowdown.
								// Pushing its rect off-screen and/or zeroing its width/height yields major perf boost for scrolling on heavy maps. (yes, was tested)
								!uiState.layoutHelperMap_show && {
									right: 9999, bottom: 9999,
									width: 0, height: 0,
								},
							)}
						>
							<style>{`
							/* Given "visibility:hidden", "opacity:0" and "pointer-event:none" are presumably not needed, but we add them to ensure hiding/input-disabling in case of browser inconsistencies. */
							.hideAndCompletelyBlockMouseEvents { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }
							.hideAndCompletelyBlockMouseEvents * { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }
							`}</style>
							<MapUI {...{mapID, map, mapState, mapView, rootNode}} graphInfo={graph_forLayoutHelper} forLayoutHelper={true}/>
						</div>
					</>}
				</div>
			</Row>
		</Column>
	);
});
