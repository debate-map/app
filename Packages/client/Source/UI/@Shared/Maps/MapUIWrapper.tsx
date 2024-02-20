import {DoesMapPolicyGiveMeAccess_ExtraCheck, GetMap, GetNodeL3, GetTimelineSteps, IsNodeL2, IsNodeL3, NodeL3, NodeType} from "dm_common";
import React, {useEffect, useMemo, useState} from "react";
import {store} from "Store/index.js";
import {GetMapState, GetTimelinePanelOpen} from "Store/main/maps/mapStates/$mapState.js";
import {GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {Graph} from "tree-grapher";
import {ShowHeader} from "UI/@SL/SL.js";
import {ES, HTMLProps, Observer, UseWindowEventListener} from "web-vcore";
import {Assert, E, Timer, ea, emptyArray} from "web-vcore/nm/js-vextensions.js";
import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {GetPlaybackInfo} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {GetPlaybackTimeTrackerState} from "Store/main/maps/mapStates/PlaybackAccessors/ForEffects.js";
import {TimelinePanel} from "../Timelines/TimelinePanel.js";
import {useGraph} from "./MapGraph.js";
import {MapUI} from "./MapUI.js";
import {ActionBar_Left} from "./MapUI/ActionBar_Left.js";
import {ActionBar_Right} from "./MapUI/ActionBar_Right.js";
import {ARG_MAX_WIDTH_FOR_IT_AND_ARG_BAR_TO_FIT_BEFORE_PREMISE_TOOLBAR, ARG_MAX_WIDTH_FOR_IT_TO_FIT_BEFORE_PREMISE_TOOLBAR, TOOLBAR_HEIGHT_BASE} from "./Node/NodeLayoutConstants.js";
import {NodeUI_ForBots} from "./Node/NodeUI_ForBots.js";
import {TimelineEffectApplier_Smooth} from "./MapUI/TimelineEffectApplier_Smooth.js";
import {TimeTrackerUI} from "./MapUI/TimeTrackerUI.js";

export class MapUIWaitMessage extends BaseComponent<{message: string}, {}> {
	render() {
		const {message} = this.props;
		return (
			<div style={ES({
				display: "flex", alignItems: "center", justifyContent: "center", flex: 1, fontSize: 25,
				//textShadow: "#000 0px 0px 1px,   #000 0px 0px 1px,   #000 0px 0px 1px, #000 0px 0px 1px,   #000 0px 0px 1px,   #000 0px 0px 1px",
				color: "white",
				textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
			})}>
				{message}
			</div>
		);
	}
}

export type Padding = {left: number, right: number, top: number, bottom: number};

type Props = {
	mapID: string, rootNode?: NodeL3,
	withinPage?: boolean, padding?: Padding,
	//subNavBarWidth?: number,
} & HTMLProps<"div">;
@Observer
export class MapUIWrapper extends BaseComponent<Props, {}> {
	static ValidateProps(props) {
		const {rootNode} = props;
		if (rootNode) {
			Assert(IsNodeL2(rootNode), "Node supplied to MapUI is not level-2!");
			Assert(IsNodeL3(rootNode), "Node supplied to MapUI is not level-3!");
		}
	}

	render() {
		const {mapID, rootNode: rootNode_passed, withinPage, ...rest} = this.props;
		//Assert(padding && subNavBarWidth != null); // nn: default-values set

		const GetMapUIPadding = (): Padding=>{
			if (this.props.padding) return padding;
			if (store.main.maps.screenshotMode) return {left: 100, right: 100, top: 100, bottom: 100};

			/*const winWidth = screen.availWidth;
			const winHeight = screen.availHeight - 45 - 30; // exclude the nav-bar and sub-nav-bar*/
			const winWidth = window.innerWidth;
			const winHeight = window.innerHeight - 45 - 30; // exclude the nav-bar and sub-nav-bar

			// if header hidden, we're probably in iframe, so adjust padding to be a lot smaller (large paddings are confusing in small viewport)
			const mult = ShowHeader ? .9 : .3;
			return {left: winWidth * mult, right: winWidth * mult, top: winHeight * mult, bottom: winHeight * mult};
		};
		const [padding, setPadding] = useState(GetMapUIPadding());
		UseWindowEventListener("resize", ()=>{
			setPadding(GetMapUIPadding());
		});

		Assert(mapID, "mapID is null!");

		const graph_forLayoutHelper = useGraph(true, null);
		const graph_main = useGraph(false, graph_forLayoutHelper);

		const map = GetMap(mapID);
		if (map == null) return <MapUIWaitMessage message="Map is private/deleted."/>;
		// defensive; in case something goes wrong with the server-side permission-enforcing, do a basic check here as well
		if (!DoesMapPolicyGiveMeAccess_ExtraCheck(mapID)) return <MapUIWaitMessage message="Map is private/deleted."/>;

		// atm, only enable this in dev-mode (it makes the initial-loading too slow to be enabled in prod, atm :/ -- keeping it enabled in dev, so I can keep optimizing it, however)
		/*if (DEV) {
			GetPreloadData_ForMapLoad(mapID);
		}*/
		const mapState = GetMapState(mapID);
		if (!mapState?.initDone) return <MapUIWaitMessage message="Initializing map metadata..."/>;

		// update some graph info
		graph_main.containerPadding = padding;
		graph_forLayoutHelper.containerPadding = padding;

		const mapView = GetMapView(mapID);
		if (mapView == null) return <MapUIWaitMessage message="Initializing map view..."/>;

		const rootNode = (()=>{
			let result: NodeL3|n = rootNode_passed;
			if (result == null && map && map.rootNode) {
				result = GetNodeL3(`${map.rootNode}`);
			}
			if (isBot && map) {
				if (mapView) {
					const nodeID = mapView.bot_currentNodeID;
					if (nodeID) {
						result = GetNodeL3(`${nodeID}`);
					}
				}
			}
			return result;
		})();
		if (rootNode == null) return <MapUIWaitMessage message="Map's content is private/deleted."/>;
		//if (GetNodeView(map.id, rootNode.id, false) == null) return <MapUIWaitMessage message="Initializing root-node view..."/>; // maybe temp

		if (isBot) {
			return <NodeUI_ForBots map={map} node={rootNode}/>;
		}

		const uiState = store.main.timelines;
		const timelinePanelOpen = map ? GetTimelinePanelOpen(map.id) : null;
		const playback = GetPlaybackInfo();
		//const timelineSteps = playback?.timeline ? GetTimelineSteps(playback.timeline.id) : ea;
		const timeTrackerVisible = mapState.playingTimeline_time != null ? GetPlaybackTimeTrackerState() : false;

		//const subNavBarWidth = 104;
		const subNavBarWidth = 0;
		const actionBarHeight = ShowHeader ? 30 : 0;
		return (
			<Column style={ES({flex: 1})}>
				{!withinPage && ShowHeader &&
				<>
					<ActionBar_Left map={map} subNavBarWidth={subNavBarWidth}/>
					{/*<SubNavBar>
						<SubNavBarButton page={store.main.page} subpage="graph" text="Graph"/>
						<SubNavBarButton page={store.main.page} subpage="focus" text="Focus"/>
					</SubNavBar>*/}
					<ActionBar_Right map={map} subNavBarWidth={subNavBarWidth}/>
				</>}
				<Row style={{
					position: "relative", // needed for TimelinePanel->AudioPanel to be positioned correctly
					marginTop: actionBarHeight, height: `calc(100% - ${actionBarHeight}px)`, alignItems: "flex-start",
				}}>
					{!withinPage && timelinePanelOpen &&
						<TimelinePanel map={map}/>}
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
								//boxShadow: "0 0 0 5px red", marginLeft: 5, marginTop: 5,
							},
						)}
					>
						{playback?.timeline != null && timeTrackerVisible &&
							<TimeTrackerUI map={map}/>}
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
	}
}