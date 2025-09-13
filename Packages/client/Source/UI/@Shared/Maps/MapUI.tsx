import {GetMap, DMap, MapView, NodeL3, NodeType_Info} from "dm_common";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {GetOpenMapID} from "Store/main.js";
import {MapState} from "Store/main/maps/mapStates/@MapState.js";
import {ACTNodeSelect, GetAnchorNodePath, GetMapView, GetNodeView, GetNodeViewsAlongPath, GetSelectedNodePath, GetViewOffset} from "Store/main/maps/mapViews/$mapView.js";
import {ConnectorLinesUI, Graph, GraphColumnsVisualizer, GraphContext, SpaceTakerUI} from "tree-grapher";
import {SLMode, ShowHeader} from "UI/@SL/SL.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {TreeGraphDebug} from "Utils/UI/General.js";
import {ES, GetDistanceBetweenRectAndPoint, GetViewportRect, HTMLProps, inFirefox, StoreAction} from "web-vcore";
import {Assert, E, FromJSON, GetTreeNodesInObjTree, NN, SleepAsync, Timer, ToJSON, Vector2, VRect} from "js-vextensions";
import {VMenuItem, VMenuStub} from "react-vmenu";
import {ScrollView} from "react-vscrollview";
import {Padding} from "./MapUIWrapper.js";
import {NodeUI} from "./Node/NodeUI.js";
import {observer_mgl} from "mobx-graphlink";

let _currentMapUIHandle: MapUIHandle|n;
type MapUIHandle = {
	// if its mounted then it won't be null/undeffined
	readonly elem: HTMLDivElement|n,
	scrollToMakeRectVisible: (targetRect: VRect, padding: number, stopLoadingStoredScroll: boolean)=>void,
	getMapCenter_AsUnzoomed: (zoomLevel: number)=>void,
	adjustMapScrollToPreserveCenterPoint: (mapCenter: Vector2, zoomLevel: number)=>void,
	scheduleAfterNextRender : (func: ()=>void)=>void,
	startLoadingScroll : ()=>void,
	scrollToPositionCenter: (posInContainer: Vector2)=>void,
	getNodeBoxClosestToViewCenter: ()=>Element|n,
}

export const currentMapUI = ():MapUIHandle|n=>{
	if (!_currentMapUIHandle) return null;
	if (!_currentMapUIHandle.elem) return null;

	return _currentMapUIHandle;
}

export function GetViewOffsetForNodeBox(nodeBoxEl: Element) {
	const viewCenter_onScreen = new Vector2(window.innerWidth / 2, window.innerHeight / 2);
	return viewCenter_onScreen.Minus(GetViewportRect(nodeBoxEl).Position).NewX(x=>x.RoundTo(1)).NewY(y=>y.RoundTo(1));
}

export const ACTUpdateAnchorNodeAndViewOffset = StoreAction((mapID: string)=>{
	// unmark-as-anchor the old anchor node
	const mapView = GetMapView(mapID);
	if (mapView) {
		const nodes = GetTreeNodesInObjTree(mapView.rootNodeViews, true);
		const oldAnchorNode = nodes.FirstOrX(a=>a.Value && a.Value.viewAnchor);
		if (oldAnchorNode) {
			oldAnchorNode.Value.viewAnchor = false;
			oldAnchorNode.Value.viewOffset = null;
		}
	}

	// CreateMapViewIfMissing(mapID);
	/* let selectedNodePath = GetSelectedNodePath(mapID);
	let anchorNodeBox = selectedNodePath ? GetNodeBoxForPath(selectedNodePath) : GetNodeBoxClosestToViewCenter(); */
	const anchorNodeBox = currentMapUI()?.getNodeBoxClosestToViewCenter();
	if (anchorNodeBox == null) return; // can happen if node was just deleted

	const anchorNodePath = anchorNodeBox.getAttribute("data-nodebox-path");
	if (anchorNodePath == null) return; // can happen sometimes; not sure what causes
	const viewOffset = GetViewOffsetForNodeBox(anchorNodeBox);

	ACTSetAnchorNodeAndViewOffset(mapID, anchorNodePath, viewOffset);
});
export const ACTSetAnchorNodeAndViewOffset = StoreAction((mapID: string, anchorNodePath: string | string[], viewOffset: Vector2)=>{
	let nodeView = GetNodeView(mapID, anchorNodePath);
	if (nodeView == null || !nodeView.viewAnchor || !viewOffset.Equals(nodeView.viewOffset)) {
		if (nodeView == null) {
			nodeView = GetNodeViewsAlongPath(mapID, anchorNodePath, true).Last();
		}
		nodeView.viewAnchor = true;
		nodeView.viewOffset = viewOffset;
	}
});

export function GetMapUICSSFilter() {
	return SLMode ? "drop-shadow(rgba(0,0,0,.7) 0px 0px 10px)" : "drop-shadow(rgba(0,0,0,.75) 0px 0px 10px)";
}

type Props = {
	// pass-through
	mapID: string, withinPage?: boolean, padding?: Padding,
	// from wrapper
	graphInfo: Graph, forLayoutHelper?: boolean,
	// could recalc these here, but might as well get from wrapper (it handles it already, due to checking if needs to show the wait-messages)
	map: DMap, mapState: MapState, mapView: MapView, rootNode: NodeL3,
} & HTMLProps<"div">;

export const MapUI = observer_mgl((props: Props)=>{
	const {mapID, rootNode: rootNode_passed, withinPage, graphInfo, forLayoutHelper, map, mapState, mapView, rootNode, ...rest} = props;

	const [containerElResolved, setContainerElResolved] = useState(false);
	const mountedRef = useRef(false);
	const scrollViewRef = useRef<ScrollView>(null);
	const mapUIElRef = useRef<HTMLDivElement>(null);
	const downPosRef = useRef<Vector2>(null);
	const lastScrolledToPathRef = useRef<string>("");
	const funcsToRunAfterNextRenderRef = useRef<(() => void)[]>([]);
	const mapUIHandleRef = useRef<MapUIHandle | null>(null);

	const getMap = useCallback(()=>{
		return GetMap.CatchBail(null, mapID);
	}, [mapID]);

	const loadAnchorNodeTimer = useRef(new Timer(100, ()=>{
		if (!mountedRef.current) return loadAnchorNodeTimer.current.Stop();

		const m = getMap();
		if (!m) return loadAnchorNodeTimer.current.Stop();
		const anchorNodePath = GetAnchorNodePath(m.id);
		if (!anchorNodePath) return loadAnchorNodeTimer.current.Stop();

		// if more nodes have been rendered, along the path to the focus-node
		const foundBox = findNodeBox(anchorNodePath, true);
		const foundPath = foundBox?.getAttribute("data-nodebox-path") ?? "";
		if (foundPath.length > lastScrolledToPathRef.current.length) {
			if (loadStoredScroll()) {
				lastScrolledToPathRef.current = foundPath;
			}
		}

		if (lastScrolledToPathRef.current == anchorNodePath && scrollViewRef.current) {
			onLoadComplete();
			return loadAnchorNodeTimer.current.Stop();
		}
	}));

	const zoomLevel = mapState && mapState.zoomLevel != 1 ? mapState.zoomLevel : 1;

	useEffect(()=>{
		mountedRef.current = true;

		// don't set this map-ui as the "current/main one", if it's the "layout helper" map (ie. the hidden, secondary map used just for helping with layout calculations)
		if (!forLayoutHelper) {
			mapUIHandleRef.current = {
				get elem() {
					return scrollViewRef.current?.ContentOuterDOM;
				},
				scrollToMakeRectVisible,
				getMapCenter_AsUnzoomed,
				adjustMapScrollToPreserveCenterPoint,
				scheduleAfterNextRender,
				startLoadingScroll,
				scrollToPositionCenter,
				getNodeBoxClosestToViewCenter
			};
			_currentMapUIHandle = mapUIHandleRef.current;
		}

		(async()=>{
		    for (let i = 0; i < 30 && getMap() == null; i++) {
		      await SleepAsync(100);
		    }
			if (getMap() == null) return;
			startLoadingScroll();
		})();

		return ()=>{
			mountedRef.current = false;
			if (_currentMapUIHandle === mapUIHandleRef.current) {
				_currentMapUIHandle = null;
			}
		}
	},[]) // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(()=>{
		const m = getMap();
		if (m) {
			SetMapVisitTimeForThisSession(m.id, Date.now());
		}

		funcsToRunAfterNextRenderRef.current.forEach(a=>a());
		funcsToRunAfterNextRenderRef.current.length = 0;
	});

	const startLoadingScroll = ()=>{
		lastScrolledToPathRef.current = "";
		loadAnchorNodeTimer.current.Start();
	}

	const onLoadComplete = ()=>{
		// NOTE: there was some debug logging, but was removed due to moving to functional component
		// (coz they werent' supported in functional component) maybe we need it back?
		loadStoredScroll()
	}

	// to keep view-center while zooming
	const getMapCenter_AsUnzoomed = (zoomLvl: number)=>{
		const scrollContainer = mapUIElRef.current?.parentElement?.parentElement;
		if (mapUIElRef.current == null || scrollContainer == null) return null;
		const scrollContainerRect = GetViewportRect(scrollContainer);
		const scrollContainerSize_unzoomed = scrollContainerRect.Size.DividedBy(zoomLvl);
		const mapCenter = new Vector2(
			(scrollContainer.scrollLeft / zoomLvl) + (scrollContainerSize_unzoomed.x / 2),
			(scrollContainer.scrollTop / zoomLvl) + (scrollContainerSize_unzoomed.y / 2),
		);
		return mapCenter;
	};

	const adjustMapScrollToPreserveCenterPoint = (mapCenter: Vector2, zoomLvl: number)=>{
		const scrollContainer = mapUIElRef.current?.parentElement?.parentElement;
		if (mapUIElRef.current == null || scrollContainer == null) return;
		const scrollContainerRect = GetViewportRect(scrollContainer);
		const scrollContainerSize_unzoomed = scrollContainerRect.Size.DividedBy(zoomLvl);
		setScrollIfChanged(new Vector2(
			(mapCenter.x - (scrollContainerSize_unzoomed.x / 2)) * zoomLvl,
			(mapCenter.y - (scrollContainerSize_unzoomed.y / 2)) * zoomLvl,
		));
	};

	const scheduleAfterNextRender = (func: ()=>void)=>{
		funcsToRunAfterNextRenderRef.current.push(func);
	}

	const loadStoredScroll = ()=>{
		const m = getMap();
		if (!m || !scrollViewRef.current) return false;

		// if user is already scrolling manually, don't interrupt (but count as successful scroll)
		if (scrollViewRef.current.state.scrollOp_bar) return true;

		const anchorNode_target = GetAnchorNodePath(GetMapView(m.id));
		if (anchorNode_target == null) return false;

		return scrollToNode(anchorNode_target);
	};

	const getNodeBoxes = (filterOutInvisible = true)=>{
		if (mapUIElRef.current == null) return [];
		const selector = filterOutInvisible
			//? `.NodeUI:not(.opacity0) > .NodeBox` // this doesn't work, since the opacity:0 is being set by the tree-grapher lib
			? `.NodeUI:not([style*="opacity: 0"]) > .NodeBox`
			: `.NodeBox`;

		return Array.from(mapUIElRef.current.querySelectorAll(selector));
	};

	const getNodeBoxClosestToViewCenter = ():Element|n=>{
		const viewCenter_onScreen = new Vector2(window.innerWidth / 2, window.innerHeight / 2);
		const nodeBoxes = getNodeBoxes();
		return nodeBoxes.filter(box=>box != null).Min(box=>GetDistanceBetweenRectAndPoint(GetViewportRect(box), viewCenter_onScreen));
	};

	const findNodeBox = (nodePath: string, ifMissingFindAncestor = false, filterOutInvisible = true)=>{
		const nodeBoxes = getNodeBoxes(filterOutInvisible);

		let targetNodeBox: Element|n;
		let nextPathTry = nodePath;
		while (targetNodeBox == null) {
			targetNodeBox = nodeBoxes.FirstOrX(box=>{
				const path = box.getAttribute("data-nodebox-path")!;
				return path == nextPathTry;
			});
			// if finding ancestors is disabled, or there are no ancestors left, stop up-search
			if (!ifMissingFindAncestor || !nextPathTry.Contains("/")) break;
			nextPathTry = nextPathTry.slice(0, nextPathTry.lastIndexOf("/"));
		}
		return targetNodeBox;
	};

	const scrollToNode = (nodePath: string)=>{
		const m = getMap();
		if (m == null) return;

		const viewOffset_target = GetViewOffset(GetMapView(m.id));
		if (nodePath == null || viewOffset_target == null) return true; // if invalid entry, count as success?

		const anchorNodeBox = findNodeBox(nodePath, true);
		if (anchorNodeBox == null) return false;
		const anchorNodeBoxCenter = GetViewportRect(NN(anchorNodeBox)).Center.Minus(GetViewportRect(NN(mapUIElRef.current)).Position);
		scrollToPositionCenter(anchorNodeBoxCenter.Plus(viewOffset_target));
		return true;
	};

	const scrollToPositionCenter = (posInContainer: Vector2)=>{
		if (!scrollViewRef.current) return;

		const scrollContainerViewportSize = GetViewportRect(scrollViewRef.current.ContentOuterDOM).Size;
		const oldScroll = scrollViewRef.current.GetScroll();
		const newScroll = new Vector2(
			posInContainer.x - (scrollContainerViewportSize.x / 2),
			posInContainer.y - (scrollContainerViewportSize.y / 2),
		);

		if (withinPage) { // if within a page, don't apply stored vertical-scroll
			newScroll.y = oldScroll.y;
		}

		setScrollIfChanged(newScroll, ()=>console.log("Loading scroll:", newScroll.toString(), "@center:", posInContainer.toString()));
	};

	const scrollToMakeRectVisible = (targetRect: VRect, padding = 0, stopLoadingStoredScroll = true)=>{
		if (padding != 0) targetRect = targetRect.Grow(padding);
		if (!scrollViewRef.current|| !mapUIElRef.current) return;

		const mapUIBackgroundRect = GetViewportRect(mapUIElRef.current);
		const oldScroll = scrollViewRef.current.GetScroll();
		const viewportRect = GetViewportRect(scrollViewRef.current.ContentOuterDOM).NewPosition(a=>a.Minus(mapUIBackgroundRect));

		const newViewportRect = viewportRect.Clone();
		if (targetRect.Left < newViewportRect.Left) newViewportRect.x = targetRect.x; // if target-rect extends further left, reposition left
		if (targetRect.Right > newViewportRect.Right) newViewportRect.x = targetRect.Right - newViewportRect.width; // if target-rect extends further right, reposition right
		if (targetRect.Top < newViewportRect.Top) newViewportRect.y = targetRect.y; // if target-rect extends further up, reposition up
		if (targetRect.Bottom > newViewportRect.Bottom) newViewportRect.y = targetRect.Bottom - newViewportRect.height; // if target-rect extends further down, reposition down

		const scrollNeededToEnactNewViewportRect = newViewportRect.Position.Minus(viewportRect.Position);
		const newScroll = new Vector2(oldScroll).Plus(scrollNeededToEnactNewViewportRect);
		setScrollIfChanged(newScroll, ()=>console.log("Loading scroll:", newScroll.toString(), "@TargetRect", targetRect.toString()));

		// the loadAnchorNodeTimer keeps running until it scrolls to the stored "anchor node"
		// if timeline is playing, anchor-node is concealed, so timer keeps running
		// this conflicts with the timeline's scrolling, so cancel the load-stored-anchor-node timer
		if (stopLoadingStoredScroll) loadAnchorNodeTimer.current.Stop();
	};

	const setScrollIfChanged = (newScroll: Vector2, logFunc?: ()=>any)=>{
		if (!scrollViewRef.current) return;
		if (newScroll.Equals(scrollViewRef.current.GetScroll())) return;

		const existingScroll = scrollViewRef.current.GetScroll();
		if (newScroll.x.Distance(existingScroll.x) < 1 && newScroll.y.Distance(existingScroll.y) < 1) return;

		logFunc?.();
		scrollViewRef.current.SetScroll(newScroll);
	};

	const handleMapUIRef = useCallback((c: HTMLDivElement)=>{
		mapUIElRef.current = c;
		graphInfo.containerEl = c;
		if (graphInfo.containerEl != null) setContainerElResolved(true);
	}, [graphInfo]);

	console.log("MapUI render");

	return (
		<ScrollView {...rest}
			ref={v=>scrollViewRef.current = v}
			backgroundDrag={!mapState.subscriptionPaintMode}
			backgroundDragMatchFunc={a=>a == scrollViewRef.current?.ContentOuterDOM || a == scrollViewRef.current?.ContentOuterDOM || a == mapUIElRef.current}
			style={ES({width: "100%", height: "100%"}, withinPage && {overflow: "visible"})}
			scrollHBarStyle={E({height: 10}, withinPage && {display: "none"})} scrollVBarStyle={E({width: 10}, withinPage && {display: "none"})}
			contentOuterStyle={E(
				// optimization for smoother scrolling [2024-02-28: confirmed to help]
				// (note: keeping willChange:transform can normally make text blurry after zooming, but we're good, since we have the zoom button trigger a re-rasterization)
				{willChange: "transform"}, // todo: maybe change to {willChange: "scroll-position"}
				withinPage && {position: "relative", marginBottom: -300, paddingBottom: 300},
				withinPage && inFirefox && {overflow: "hidden"},
			)}
			onScrollEnd={()=>{
				ACTUpdateAnchorNodeAndViewOffset(map.id);
			}}
		>
			<SpaceTakerUI graph={graphInfo} scaling={zoomLevel}/>
			<style>{`
			.MapUI {
				display: inline-flex;
				/*flex-wrap: wrap;*/
			}
			.MapUI.scrolling > * { pointer-events: none; }
			`}</style>
			{
			<div className={`MapUI ${mapState.subscriptionPaintMode ? "PaintingCursor" : ""}`}
				ref={handleMapUIRef}
				style={ES(
					{
						position: "absolute", left: 0, top: 0,
						width: (1 / zoomLevel).ToPercentStr(), height: (1 / zoomLevel).ToPercentStr(),
						whiteSpace: "nowrap", alignItems: "center", filter: GetMapUICSSFilter(),
					},
					mapState.zoomLevel != 1 && {
						transform: `scale(${mapState.zoomLevel.ToPercentStr()})`,
						transformOrigin: "0% 0%",
					},
				)}
				onMouseDown={e=>{
					downPosRef.current = new Vector2(e.clientX, e.clientY);
					if (e.button == 2) { mapUIElRef.current!.classList.add("scrolling"); }
				}}
				onMouseUp={()=>{
					mapUIElRef.current!.classList.remove("scrolling");
				}}
				onClick={e=>{
					if (e.target != mapUIElRef.current) return;
					if (downPosRef.current && new Vector2(e.clientX, e.clientY).DistanceTo(downPosRef.current) >= 3) return;
					if (GetSelectedNodePath(map.id)) {
						ACTNodeSelect(map.id, null);
					}
				}}
				onContextMenu={e=>{
					if (e.nativeEvent["handled"]) return true;
					// block regular right-click actions on map background (so it doesn't conflict with custom right-click contents)
					if (ShowHeader) {
						e.preventDefault();
					} else {
						// if not in iframe, only block it if right-click was over a node-ui (one reason being that, in iframe, the native right-click menu is needed to press "Back")
						const rightClickedOverNode = (e.nativeEvent.target as HTMLElement).closest(".NodeUI") != null;
						if (rightClickedOverNode) {
							e.preventDefault();
						}
					}
				}}
			>
				{containerElResolved &&
				<GraphContext.Provider value={graphInfo}>
					{TreeGraphDebug() && <GraphColumnsVisualizer levelsToScrollContainer={3}/>}
					<ConnectorLinesUI/>
					<NodeUI
							indexInNodeList={0}
							map={map}
							node={rootNode}
							path={(Assert(rootNode.id != null), rootNode.id.toString())}
							treePath="0"
							standardWidthInGroup={NodeType_Info.for[rootNode.type].minWidth}
							forLayoutHelper={forLayoutHelper ?? false}
						/>
					{ShowHeader && // on right-click, show hint about how to add nodes -- but only if header is shown (ie. not in iframe)
					<VMenuStub delayEventHandler={true} preOpen={e=>!e.handled}>
						<VMenuItem text="(To add a node, right click on an existing node.)" style={liveSkin.Style_VMenuItem()}/>
					</VMenuStub>}
				</GraphContext.Provider>}
			</div>
			}
		</ScrollView>
	);
});

window.addEventListener("beforeunload", ()=>{
	const mapID = GetOpenMapID();
	SetMapVisitTimeForThisSession(mapID, Date.now());
});

const SetMapVisitTimeForThisSession = (mapID: string|n, _time: number)=>{
	if (mapID == null) return;
	const lastMapViewTimes = FromJSON(localStorage.getItem(`lastMapViewTimes_${mapID}`) || `[${Date.now()}]`) as number[];

	const mapsViewedThisSession = g.mapsViewedThisSession || {};
	if (mapsViewedThisSession[mapID] == null) {
		lastMapViewTimes.Insert(0, Date.now());
		if (lastMapViewTimes.length > 10) lastMapViewTimes.splice(-1, 1);
	} else {
		lastMapViewTimes[0] = Date.now();
	}

	localStorage.setItem(`lastMapViewTimes_${mapID}`, ToJSON(lastMapViewTimes));
	mapsViewedThisSession[mapID] = true;
	G({mapsViewedThisSession});
};
