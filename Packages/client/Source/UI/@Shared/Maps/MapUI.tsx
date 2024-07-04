import {GetMap, GetParentNodeL3, GetParentPath, Map, MapView, NodeL3, NodeType_Info} from "dm_common";
import React, {useCallback, useState} from "react";
import {GetOpenMapID} from "Store/main.js";
import {MapState} from "Store/main/maps/mapStates/@MapState.js";
import {ACTNodeSelect, GetAnchorNodePath, GetMapView, GetNodeView, GetNodeViewsAlongPath, GetSelectedNodePath, GetViewOffset} from "Store/main/maps/mapViews/$mapView.js";
import {ConnectorLinesUI, Graph, GraphColumnsVisualizer, GraphContext, SpaceTakerUI} from "tree-grapher";
import {SLMode, ShowHeader} from "UI/@SL/SL.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {TreeGraphDebug} from "Utils/UI/General.js";
import {ES, GetDistanceBetweenRectAndPoint, GetViewportRect, HTMLProps, inFirefox, Observer, StoreAction} from "web-vcore";
import {Assert, DeepGet, E, FindDOMAll, FromJSON, GetTreeNodesInObjTree, NN, SleepAsync, Timer, ToJSON, Vector2, VRect} from "web-vcore/nm/js-vextensions.js";
import {BaseComponent, FindReact, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem, VMenuStub} from "web-vcore/nm/react-vmenu.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {store} from "Store/index.js";
import {Padding} from "./MapUIWrapper.js";
import {ExpandableBox} from "./Node/ExpandableBox.js";
import {NodeBox} from "./Node/NodeBox.js";
import {NodeUI} from "./Node/NodeUI.js";
import {navBarHeight} from "../NavBar.js";

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
	const anchorNodeBox = MapUI.CurrentMapUI?.GetNodeBoxClosestToViewCenter();
	if (anchorNodeBox == null) return; // can happen if node was just deleted

	const anchorNodePath = anchorNodeBox.props.path;
	if (anchorNodePath == null) return; // can happen sometimes; not sure what causes
	const viewOffset = GetViewOffsetForNodeBox(anchorNodeBox.DOM!);

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
	map: Map, mapState: MapState, mapView: MapView, rootNode: NodeL3,
} & HTMLProps<"div">;
@Observer
export class MapUI extends BaseComponent<Props, {}> {
	private static currentMapUI: MapUI|n;
	static get CurrentMapUI() { return MapUI.currentMapUI && MapUI.currentMapUI.mounted && MapUI.currentMapUI.scrollView ? MapUI.currentMapUI : null; }

	scrollView: ScrollView|n;
	mapUIEl: HTMLDivElement|n;
	downPos: Vector2|n;
	render() {
		const {mapID, rootNode: rootNode_passed, withinPage, padding, graphInfo, forLayoutHelper, map, mapState, mapView, rootNode, ...rest} = this.props;

		const [containerElResolved, setContainerElResolved] = useState(false);
		const mapUI_ref = useCallback(c=>{
			this.mapUIEl = c;
			graphInfo.containerEl = c;
			if (graphInfo.containerEl != null) setContainerElResolved(true);
		}, [graphInfo]);

		const zoomLevel = mapState && mapState.zoomLevel != 1 ? mapState.zoomLevel : 1;
		//graphInfo.contentScaling = zoomLevel;
		//graphInfo.SetContentScaling(zoomLevel);
		return (
			<ScrollView {...rest} ref={c=>this.scrollView = c}
				backgroundDrag={!mapState.subscriptionPaintMode} backgroundDragMatchFunc={a=>a == GetDOM(this.scrollView!.contentOuter) || a == this.scrollView!.content || a == this.mapUIEl}
				style={ES({width: "100%", height: "100%"}, withinPage && {overflow: "visible"})}
				scrollHBarStyle={E({height: 10}, withinPage && {display: "none"})} scrollVBarStyle={E({width: 10}, withinPage && {display: "none"})}
				contentOuterStyle={E(
					// optimization for smoother scrolling [2024-02-28: confirmed to help]
					// (note: keeping willChange:transform can normally make text blurry after zooming, but we're good, since we have the zoom button trigger a re-rasterization)
					{willChange: "transform"}, // todo: maybe change to {willChange: "scroll-position"}
					withinPage && {position: "relative", marginBottom: -300, paddingBottom: 300},
					withinPage && inFirefox && {overflow: "hidden"},
				)}
				onScrollEnd={pos=>{
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
				<div className={`MapUI ${mapState.subscriptionPaintMode ? "PaintingCursor" : ""}`}
					ref={mapUI_ref}
					style={ES(
						{
							//position: "relative",
							position: "absolute", left: 0, top: 0,
							width: (1 / zoomLevel).ToPercentStr(), height: (1 / zoomLevel).ToPercentStr(),
							/* display: "flex", */ whiteSpace: "nowrap",
							//padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
							alignItems: "center",
							filter: GetMapUICSSFilter(),
						},
						//mapState.zoomLevel != 1 && {zoom: mapState.zoomLevel.ToPercentStr()},
						mapState.zoomLevel != 1 && {
							transform: `scale(${mapState.zoomLevel.ToPercentStr()})`,
							transformOrigin: "0% 0%",
						},
					)}
					onMouseDown={e=>{
						this.downPos = new Vector2(e.clientX, e.clientY);
						if (e.button == 2) { this.mapUIEl!.classList.add("scrolling"); }
					}}
					onMouseUp={e=>{
						this.mapUIEl!.classList.remove("scrolling");
					}}
					onClick={e=>{
						if (e.target != this.mapUIEl) return;
						if (this.downPos && new Vector2(e.clientX, e.clientY).DistanceTo(this.downPos) >= 3) return;
						if (GetSelectedNodePath(map.id)) {
							ACTNodeSelect(map.id, null);
							//UpdateAnchorNodeAndViewOffset(map._id);
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
						{/*playingTimeline != null && <TimelineIntroBox timeline={playingTimeline}/>*/}
						<NodeUI indexInNodeList={0} map={map} node={rootNode} path={(Assert(rootNode.id != null), rootNode.id.toString())} treePath="0"
							standardWidthInGroup={NodeType_Info.for[rootNode.type].minWidth} forLayoutHelper={forLayoutHelper ?? false}/>
						{/*<ReactResizeDetector handleWidth handleHeight onResize={()=> { */}
						{/*<ResizeSensor ref="resizeSensor" onResize={()=> {
							this.LoadScroll();
						}}/>*/}
						{ShowHeader && // on right-click, show hint about how to add nodes -- but only if header is shown (ie. not in iframe)
						<VMenuStub delayEventHandler={true} preOpen={e=>!e.handled}>
							<VMenuItem text="(To add a node, right click on an existing node.)" style={liveSkin.Style_VMenuItem()}/>
						</VMenuStub>}
					</GraphContext.Provider>}
				</div>
			</ScrollView>
		);
	}

	get Map() {
		return GetMap.CatchBail(null, this.props.mapID);
	}

	async ComponentDidMount() {
		const {forLayoutHelper} = this.props;
		// don't set this map-ui as the "current/main one", if it's the "layout helper" map (ie. the hidden, secondary map used just for helping with layout calculations) 
		if (!forLayoutHelper) {
			MapUI.currentMapUI = this;
		}

		NodeUI.renderCount = 0;
		/*NodeUI.lastRenderTime = Date.now();
		let lastRenderCount = 0;*/

		for (let i = 0; i < 30 && this.Map == null; i++) await SleepAsync(100);
		if (this.Map == null) return;

		this.StartLoadingScroll();
	}
	ComponentWillUnmount() {
		if (MapUI.currentMapUI == this) {
			MapUI.currentMapUI = null;
		}
	}

	lastScrolledToPath: string;
	loadAnchorNodeTimer = new Timer(100, ()=>{
		if (!this.mounted) return this.loadAnchorNodeTimer.Stop();

		const map = this.Map;
		if (map == null) return this.loadAnchorNodeTimer.Stop();
		const anchorNodePath = GetAnchorNodePath(map.id);
		if (anchorNodePath == null) return this.loadAnchorNodeTimer.Stop();

		// if more nodes have been rendered, along the path to the focus-node
		const foundBox = this.FindNodeBox(anchorNodePath, true);
		const foundPath = foundBox ? foundBox.props.path : "";
		if (foundPath.length > this.lastScrolledToPath.length) {
			if (this.LoadStoredScroll()) {
				this.lastScrolledToPath = foundPath;
			}
		}

		// if (foundPath == anchorNodePath && this.scrollView) {
		if (this.lastScrolledToPath == anchorNodePath && this.scrollView) {
			this.OnLoadComplete();
			return this.loadAnchorNodeTimer.Stop();
		}
	});
	StartLoadingScroll() {
		/* let playingTimeline = await GetAsync(()=>GetPlayingTimeline(map._id));
		if (!playingTimeline) { */ // only load-scroll if not playing timeline; timeline gets priority, to focus on its latest-revealed nodes
		this.lastScrolledToPath = "";
		this.loadAnchorNodeTimer.Start();
	}
	OnLoadComplete() {
		console.log(`
			NodeUI render count: ${NodeUI.renderCount} (${NodeUI.renderCount / document.querySelectorAll(".NodeUI").length} per visible node)
			TimeSincePageLoad: ${Date.now() - performance.timing.domComplete}ms
		`.AsMultiline(0));
		this.LoadStoredScroll();
	}

	// funcs to keep view-center while zooming
	GetMapCenter_AsUnzoomed(zoomLevel: number) {
		const scrollContainer = this.mapUIEl?.parentElement?.parentElement;
		if (this.mapUIEl == null || scrollContainer == null) return null;
		const scrollContainerRect = GetViewportRect(scrollContainer);
		const scrollContainerSize_unzoomed = scrollContainerRect.Size.DividedBy(zoomLevel);
		const mapCenter = new Vector2(
			(scrollContainer.scrollLeft / zoomLevel) + (scrollContainerSize_unzoomed.x / 2),
			(scrollContainer.scrollTop / zoomLevel) + (scrollContainerSize_unzoomed.y / 2),
		);
		return mapCenter;
	}
	AdjustMapScrollToPreserveCenterPoint(mapCenter: Vector2, zoomLevel: number) {
		const scrollContainer = this.mapUIEl?.parentElement?.parentElement;
		if (this.mapUIEl == null || scrollContainer == null) return;
		const scrollContainerRect = GetViewportRect(scrollContainer);
		const scrollContainerSize_unzoomed = scrollContainerRect.Size.DividedBy(zoomLevel);
		this.SetScroll_IfChanged(new Vector2(
			(mapCenter.x - (scrollContainerSize_unzoomed.x / 2)) * zoomLevel,
			(mapCenter.y - (scrollContainerSize_unzoomed.y / 2)) * zoomLevel,
		));
	}

	funcsToRunAfterNextRender = [] as (()=>void)[];
	ScheduleAfterNextRender(func: ()=>void) {
		this.funcsToRunAfterNextRender.push(func);
	}
	PostRender() {
		const {withinPage} = this.props;
		const map = this.Map;
		/*if (withinPage && this.scrollView) {
			this.scrollView.vScrollableDOM = $('#HomeScrollView').children('.content')[0];
		}*/
		if (map) {
			SetMapVisitTimeForThisSession(map.id, Date.now());
		}
		this.funcsToRunAfterNextRender.forEach(a=>a());
		this.funcsToRunAfterNextRender.length = 0;
	}

	// load scroll from store
	LoadStoredScroll() {
		const map = this.Map;
		if (map == null) return false;
		if (this.scrollView == null) return false;
		// if user is already scrolling manually, don't interrupt (but count as successful scroll)
		if (this.scrollView.state.scrollOp_bar) return true;
		// if (this.scrollView.state.scrollOp_bar) return false;

		const anchorNode_target = GetAnchorNodePath(GetMapView(map.id)); // || map.rootNode.toString();
		if (anchorNode_target == null) return false;
		// Log(`AnchorNode_target:${anchorNode_target}`);
		return this.ScrollToNode(anchorNode_target);
	}

	GetNodeBoxes(filterOutInvisible = true) {
		if (this.mapUIEl == null) return [];
		const selector = filterOutInvisible
			//? `.NodeUI:not(.opacity0) > .NodeBox` // this doesn't work, since the opacity:0 is being set by the tree-grapher lib
			? `.NodeUI:not([style*="opacity: 0"]) > .NodeBox`
			: `.NodeBox`;
		const nodeBoxes = Array.from(this.mapUIEl.querySelectorAll(selector)).map(nodeUI_boxEl=>{
			const boxEl = FindReact(nodeUI_boxEl) as ExpandableBox;
			const result = boxEl.props.parent as NodeBox;
			Assert(result instanceof NodeBox);
			return result;
		});
		return nodeBoxes;
	}
	GetNodeBoxClosestToViewCenter() {
		const viewCenter_onScreen = new Vector2(window.innerWidth / 2, window.innerHeight / 2);
		const nodeBoxes = this.GetNodeBoxes();
		return nodeBoxes.filter(box=>box.DOM != null).Min(box=>GetDistanceBetweenRectAndPoint(GetViewportRect(box.DOM!), viewCenter_onScreen));
	}
	FindNodeBox(nodePath: string, ifMissingFindAncestor = false, filterOutInvisible = true) {
		const nodeBoxes = this.GetNodeBoxes(filterOutInvisible);

		let targetNodeBox: NodeBox|n;
		let nextPathTry = nodePath;
		while (targetNodeBox == null) {
			targetNodeBox = nodeBoxes.FirstOrX(box=>box.props.path == nextPathTry);
			// if finding ancestors is disabled, or there are no ancestors left, stop up-search
			if (!ifMissingFindAncestor || !nextPathTry.Contains("/")) break;
			nextPathTry = nextPathTry.slice(0, nextPathTry.lastIndexOf("/"));
		}
		// if (targetNodeUI == null) Log(`Failed to find node-box for: ${nodePath}`);
		return targetNodeBox;
	}
	ScrollToNode(nodePath: string) {
		const map = this.Map;
		if (map == null) return;

		const viewOffset_target = GetViewOffset(GetMapView(map.id)); // || new Vector2(200, 0);
		// Log(`LoadingScroll:${nodePath};${ToJSON(viewOffset_target)}`);
		if (nodePath == null || viewOffset_target == null) return true; // if invalid entry, count as success?

		const anchorNodeBox = this.FindNodeBox(nodePath, true);
		if (anchorNodeBox == null) return false;
		const anchorNodeBoxCenter = GetViewportRect(NN(GetDOM(anchorNodeBox))).Center.Minus(GetViewportRect(NN(this.mapUIEl)).Position);
		this.ScrollToPosition_Center(anchorNodeBoxCenter.Plus(viewOffset_target));
		return true;
	}
	ScrollToPosition_Center(posInContainer: Vector2) {
		const {withinPage} = this.props;
		if (this.scrollView == null) return;

		//const scrollContainerViewportSize = new Vector2(this.scrollView.vScrollableDOM.getBoundingClientRect().width, this.scrollView.vScrollableDOM.getBoundingClientRect().height);
		const scrollContainerViewportSize = GetViewportRect(GetDOM(this.scrollView.contentOuter)!).Size;
		//const topBarsHeight = window.innerHeight - scrollContainerViewportSize.y;
		//const topBarsHeight = navBarHeight + 30; // todo: replace with subNavBarHeight const from web-vcore (once updated)

		const oldScroll = this.scrollView.GetScroll();
		const newScroll = new Vector2(
			posInContainer.x - (scrollContainerViewportSize.x / 2),
			posInContainer.y - (scrollContainerViewportSize.y / 2),

			// scroll down a bit extra, such that node is center of window, not center of scroll-view container/viewport (I've tried both, and this way is more centered "perceptually")
			// commented; this offset looks bad in recordings of just the map-view, so just disable the offset always (for consistency)
			//(posInContainer.y - (scrollContainerViewportSize.y / 2)) + (topBarsHeight / 2),
		);
		if (withinPage) { // if within a page, don't apply stored vertical-scroll
			newScroll.y = oldScroll.y;
		}
		this.SetScroll_IfChanged(newScroll, ()=>console.log("Loading scroll:", newScroll.toString(), "@center:", posInContainer.toString()));
		// Log("Scrolling to position: " + newScroll);

		/* if (nextPathTry == nodePath)
			this.hasLoadedScroll = true; */
	}

	ScrollToMakeRectVisible(targetRect: VRect, padding = 0, stopLoadingStoredScroll = true) {
		if (padding != 0) targetRect = targetRect.Grow(padding);
		if (this.scrollView == null || this.mapUIEl == null) return;

		const mapUIBackgroundRect = GetViewportRect(this.mapUIEl);
		const oldScroll = this.scrollView.GetScroll();
		const viewportRect = GetViewportRect(GetDOM(this.scrollView.contentOuter)!).NewPosition(a=>a.Minus(mapUIBackgroundRect));

		const newViewportRect = viewportRect.Clone();
		if (targetRect.Left < newViewportRect.Left) newViewportRect.x = targetRect.x; // if target-rect extends further left, reposition left
		if (targetRect.Right > newViewportRect.Right) newViewportRect.x = targetRect.Right - newViewportRect.width; // if target-rect extends further right, reposition right
		if (targetRect.Top < newViewportRect.Top) newViewportRect.y = targetRect.y; // if target-rect extends further up, reposition up
		if (targetRect.Bottom > newViewportRect.Bottom) newViewportRect.y = targetRect.Bottom - newViewportRect.height; // if target-rect extends further down, reposition down

		const scrollNeededToEnactNewViewportRect = newViewportRect.Position.Minus(viewportRect.Position);
		const newScroll = new Vector2(oldScroll).Plus(scrollNeededToEnactNewViewportRect);
		this.SetScroll_IfChanged(newScroll, ()=>console.log("Loading scroll:", newScroll.toString(), "@TargetRect", targetRect.toString()));

		// the loadAnchorNodeTimer keeps running until it scrolls to the stored "anchor node"
		// if timeline is playing, anchor-node is concealed, so timer keeps running
		// this conflicts with the timeline's scrolling, so cancel the load-stored-anchor-node timer
		if (stopLoadingStoredScroll) this.loadAnchorNodeTimer.Stop();
	}

	SetScroll_IfChanged(newScroll: Vector2, logFunc?: ()=>any) {
		if (this.scrollView == null) return;
		if (newScroll.Equals(this.scrollView.GetScroll())) return;

		// when scroll-pos is actually applied to element, the browser (Chrome v120 anyway) floors the values, so we need to use the floored values for comparing
		//if (newScroll.NewX(x=>Math.floor(x)).NewY(y=>Math.floor(y)).Equals(this.scrollView.GetScroll())) return;
		const existingScroll = this.scrollView.GetScroll();
		if (newScroll.x.Distance(existingScroll.x) < 1 && newScroll.y.Distance(existingScroll.y) < 1) return;

		logFunc?.();
		this.scrollView.SetScroll(newScroll);
	}
}

window.addEventListener("beforeunload", ()=>{
	const mapID = GetOpenMapID();
	SetMapVisitTimeForThisSession(mapID, Date.now());
});

function SetMapVisitTimeForThisSession(mapID: string|n, time: number) {
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
}