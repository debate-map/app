import {AccessPolicy, DoesMapPolicyGiveMeAccess_ExtraCheck, GetAccessPolicy, GetMap, GetNodeL3, GetParentNodeL3, GetParentPath, IsNodeL2, IsNodeL3, IsPremiseOfSinglePremiseArgument, Map, NodeL3, NodeType, NodeType_Info} from "dm_common";
import React, {useCallback, useMemo, useState} from "react";
import {store} from "Store/index.js";
import {GetOpenMapID} from "Store/main.js";
import {GetPreloadData_ForMapLoad} from "Store/main/@Preloading/ForMapLoad.js";
import {GetMapState, GetTimelinePanelOpen} from "Store/main/maps/mapStates/$mapState.js";
import {ACTNodeSelect, GetFocusedNodePath, GetMapView, GetNodeView, GetNodeViewsAlongPath, GetSelectedNodePath, GetViewOffset} from "Store/main/maps/mapViews/$mapView.js";
import {Graph, GraphContext, GraphColumnsVisualizer, ConnectorLinesUI} from "tree-grapher";
import {GADDemo, ShowHeader} from "UI/@GAD/GAD.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {StandardCompProps, TreeGraphDebug} from "Utils/UI/General.js";
import {ES, GetDistanceBetweenRectAndPoint, GetViewportRect, HTMLProps, inFirefox, Observer, StoreAction, SubNavBar, SubNavBarButton, UseWindowEventListener} from "web-vcore";
import {Assert, DeepGet, E, FindDOMAll, FromJSON, GetTreeNodesInObjTree, NN, SleepAsync, Timer, ToJSON, Vector2, VRect} from "web-vcore/nm/js-vextensions.js";
import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus, FindReact, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem, VMenuStub} from "web-vcore/nm/react-vmenu.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {ExpandableBox} from "./Node/ExpandableBox.js";
import {NodeUI} from "./Node/NodeUI.js";
import {NodeUI_ForBots} from "./Node/NodeUI_ForBots.js";
import {NodeUI_Inner} from "./Node/NodeUI_Inner.js";
import {ActionBar_Left} from "./MapUI/ActionBar_Left.js";
import {ActionBar_Right} from "./MapUI/ActionBar_Right.js";

export function GetNodeBoxForPath(path: string) {
	const nodeInnerBoxes = FindDOMAll(".NodeUI_Inner").map(a=>DeepGet(FindReact(a), "props/parent") as NodeUI_Inner);
	return nodeInnerBoxes.FirstOrX(a=>a.props.path == path);
}
export function GetNodeBoxClosestToViewCenter() {
	const viewCenter_onScreen = new Vector2(window.innerWidth / 2, window.innerHeight / 2);
	return FindDOMAll(".NodeUI_Inner").Min(nodeBox=>GetDistanceBetweenRectAndPoint(GetViewportRect(nodeBox), viewCenter_onScreen));
}
export function GetViewOffsetForNodeBox(nodeBox: Element) {
	const viewCenter_onScreen = new Vector2(window.innerWidth / 2, window.innerHeight / 2);
	return viewCenter_onScreen.Minus(GetViewportRect(nodeBox).Position).NewX(x=>x.RoundTo(1)).NewY(y=>y.RoundTo(1));
}

export const ACTUpdateFocusNodeAndViewOffset = StoreAction((mapID: string)=>{
	// unfocus the old focused node
	const mapView = GetMapView(mapID);
	if (mapView) {
		const nodes = GetTreeNodesInObjTree(mapView.rootNodeViews, true);
		const oldFocusNode = nodes.FirstOrX(a=>a.Value && a.Value.focused);
		if (oldFocusNode) {
			oldFocusNode.Value.focused = false;
			oldFocusNode.Value.viewOffset = null;
		}
	}

	// CreateMapViewIfMissing(mapID);
	/* let selectedNodePath = GetSelectedNodePath(mapID);
	let focusNodeBox = selectedNodePath ? GetNodeBoxForPath(selectedNodePath) : GetNodeBoxClosestToViewCenter(); */
	const focusNodeBox = GetNodeBoxClosestToViewCenter();
	if (focusNodeBox == null) return; // can happen if node was just deleted

	const focusNodeBoxComp = FindReact(focusNodeBox).props.parent as NodeUI_Inner;
	const focusNodePath = focusNodeBoxComp.props.path;
	if (focusNodePath == null) return; // can happen sometimes; not sure what causes
	const viewOffset = GetViewOffsetForNodeBox(focusNodeBox);

	ACTSetFocusNodeAndViewOffset(mapID, focusNodePath, viewOffset);
});
export const ACTSetFocusNodeAndViewOffset = StoreAction((mapID: string, focusNodePath: string | string[], viewOffset: Vector2)=>{
	let nodeView = GetNodeView(mapID, focusNodePath);
	if (nodeView == null || !nodeView.focused || !viewOffset.Equals(nodeView.viewOffset)) {
		if (nodeView == null) {
			nodeView = GetNodeViewsAlongPath(mapID, focusNodePath, true).Last();
		}
		nodeView.focused = true;
		nodeView.viewOffset = viewOffset;
	}
});

class MapUIWaitMessage extends BaseComponent<{message: string}, {}> {
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

export function GetMapUICSSFilter() {
	return GADDemo ? "drop-shadow(rgba(0,0,0,.7) 0px 0px 10px)" : "drop-shadow(rgba(0,0,0,1) 0px 0px 10px)";
}

type Props = {
	mapID: string, rootNode?: NodeL3, withinPage?: boolean,
	padding?: {left: number, right: number, top: number, bottom: number},
	//subNavBarWidth?: number,
} & HTMLProps<"div">;
@Observer
export class MapUI extends BaseComponent<Props, {}> {
	private static currentMapUI: MapUI|n;
	static get CurrentMapUI() { return MapUI.currentMapUI && MapUI.currentMapUI.mounted ? MapUI.currentMapUI : null; }

	static ValidateProps(props) {
		const {rootNode} = props;
		if (rootNode) {
			Assert(IsNodeL2(rootNode), "Node supplied to MapUI is not level-2!");
			Assert(IsNodeL3(rootNode), "Node supplied to MapUI is not level-3!");
		}
	}

	scrollView: ScrollView|n;
	mapUIEl: HTMLDivElement|n;
	downPos: Vector2|n;
	render() {
		const {mapID, rootNode: rootNode_passed, withinPage, ...rest} = this.props;
		//Assert(padding && subNavBarWidth != null); // nn: default-values set

		const GetMapUIPadding = ()=>{
			if (this.props.padding) return padding;

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

		const graphInfo = useMemo(()=>{
			const graph = new Graph({
				//columnWidth: 100,
				//uiDebugKit: {FlashComp},
				layoutOpts: {
					nodeSpacing: (nodeA, nodeB)=>{
						// do special spacing between tree-nodes that are in the same column/sequence
						const nodeAParentPath = nodeA.data.path_parts.slice(0, -1).join("/");
						const nodeBParentPath = nodeB.data.path_parts.slice(0, -1).join("/");
						if (nodeAParentPath == nodeBParentPath || (nodeA.data.path == nodeBParentPath && nodeB.data.leftColumn_connectorOpts.parentIsAbove)) {
							const nodeAIsPremiseInArg = nodeA.data.leftColumn_connectorOpts.parentIsAbove;
							const nodeBIsPremiseInArg = nodeB.data.leftColumn_connectorOpts.parentIsAbove;
							//if (nodeAIsPremiseInArg && !nodeBIsPremiseInArg) return 10;
							if (nodeAIsPremiseInArg && !nodeBIsPremiseInArg) return 15;
							//if (!nodeAIsPremiseInArg && nodeBIsPremiseInArg) return 1;
							if (!nodeAIsPremiseInArg && nodeBIsPremiseInArg) return 5;
						}

						const nodeBNodeType = nodeB.data.leftColumn_userData["nodeType"];
						// if tree-node is for a category node (or a non-node), it has no toolbar showing, so give it less spacing
						if (nodeBNodeType == NodeType.category || nodeBNodeType == null) return 15;

						// for the rest, assume it's a node with a toolbar showing at the top, so give generous spacing
						return 33;
					},
					styleSetter_layoutPending: style=>{
						//style.right = "100%"; // not ideal, since can cause some issues (eg. during map load, the center-on-loading-nodes system can jump to empty left-area of map) 
						style.opacity = "0";
						style.pointerEvents = "none";
					},
					styleSetter_layoutDone: style=>{
						//style.right = "";
						style.opacity = "";
						style.pointerEvents = "";
					},
				},
			});
			globalThis.graph = graph; // temp
			return graph;
		}, []);
		const [containerElResolved, setContainerElResolved] = useState(false);
		const mapUI_ref = useCallback(c=>{
			this.mapUIEl = c;
			graphInfo.containerEl = c;
			if (graphInfo.containerEl != null) setContainerElResolved(true);
		}, [graphInfo]);

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
		// if (GetNodeView(map.id, rootNode.id, false) == null) return <MapUIWaitMessage message="Initializing root-node view..."/>; // maybe temp
		/*if (rootNode.current.accessLevel > GetUserAccessLevel(MeID())) {
			return <Column style={ES({flex: 1})}>
				{!withinPage &&
					<ActionBar_Left map={map} subNavBarWidth={subNavBarWidth} backOnly={true}/>}
				<MapUIWaitMessage message="Insufficient permissions."/>
			</Column>;
		}*/

		if (isBot) {
			return <NodeUI_ForBots map={map} node={rootNode}/>;
		}

		const timelinePanelOpen = map ? GetTimelinePanelOpen(map.id) : null;
		//const playingTimeline = GetPlayingTimeline(map ? map.id : null);

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
				{/* !withinPage &&
					<TimelinePlayerUI map={map}/> */}
				{/*! withinPage &&
					<TimelineOverlayUI map={map}/> */}
				<Row style={{marginTop: actionBarHeight, height: `calc(100% - ${actionBarHeight}px)`, alignItems: "flex-start"}}>
					{/*!withinPage && timelinePanelOpen &&
						<TimelinePanel map={map}/>*/}
					<ScrollView {...rest.ExcludeKeys(...StandardCompProps() as any)} ref={c=>this.scrollView = c}
						backgroundDrag={true} backgroundDragMatchFunc={a=>a == GetDOM(this.scrollView!.content) || a == this.mapUIEl}
						style={ES({height: "100%"}, withinPage && {overflow: "visible"})}
						scrollHBarStyle={E({height: 10}, withinPage && {display: "none"})} scrollVBarStyle={E({width: 10}, withinPage && {display: "none"})}
						contentStyle={E(
							{willChange: "transform"},
							withinPage && {position: "relative", marginBottom: -300, paddingBottom: 300},
							withinPage && inFirefox && {overflow: "hidden"},
						)}
						// contentStyle={E({willChange: "transform"}, withinPage && {marginTop: -300, paddingBottom: 300, transform: "translateY(300px)"})}
						// bufferScrollEventsBy={10000}
						onScrollEnd={pos=>{
							// if (withinPage) return;
							ACTUpdateFocusNodeAndViewOffset(map.id);
						}}
					>
						<style>{`
						.MapUI {
							display: inline-flex;
							//flex-wrap: wrap;
						}
						.MapUI.scrolling > * { pointer-events: none; }
						`}</style>
						<div className="MapUI"
							ref={mapUI_ref}
							style={{
								position: "relative", /* display: "flex", */ whiteSpace: "nowrap",
								padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
								alignItems: "center",
								filter: GetMapUICSSFilter(),
							}}
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
								const mapView = GetMapView(GetOpenMapID());
								if (GetSelectedNodePath(map.id)) {
									ACTNodeSelect(map.id, null);
									// UpdateFocusNodeAndViewOffset(map._id);
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
								{/*playingTimeline != null &&
								<TimelineIntroBox timeline={playingTimeline}/>*/}
								<NodeUI indexInNodeList={0} map={map} node={rootNode} path={(Assert(rootNode.id != null), rootNode.id.toString())} treePath="0" widthOverride={NodeType_Info.for[rootNode.type].minWidth}/>
								{/* <ReactResizeDetector handleWidth handleHeight onResize={()=> { */}
								{/* <ResizeSensor ref="resizeSensor" onResize={()=> {
									this.LoadScroll();
								}}/> */}
								{ShowHeader && // on right-click, show hint about how to add nodes -- but only if header is shown (ie. not in iframe)
								<VMenuStub delayEventHandler={true} preOpen={e=>!e.handled}>
									<VMenuItem text="(To add a node, right click on an existing node.)" style={liveSkin.Style_VMenuItem()}/>
								</VMenuStub>}
							</GraphContext.Provider>}
						</div>
					</ScrollView>
				</Row>
			</Column>
		);
	}

	get Map() {
		return GetMap.CatchBail(null, this.props.mapID);
	}

	async ComponentDidMount() {
		MapUI.currentMapUI = this;

		NodeUI.renderCount = 0;
		/* NodeUI.lastRenderTime = Date.now();
		let lastRenderCount = 0; */

		for (let i = 0; i < 30 && this.Map == null; i++) await SleepAsync(100);
		if (this.Map == null) return;

		this.StartLoadingScroll();
	}
	ComponentWillUnmount() {
		MapUI.currentMapUI = null;
	}

	lastScrolledToPath: string;
	loadFocusedNodeTimer = new Timer(100, ()=>{
		if (!this.mounted) return this.loadFocusedNodeTimer.Stop();

		const map = this.Map;
		if (map == null) return this.loadFocusedNodeTimer.Stop();
		const focusNodePath = GetFocusedNodePath(map.id);
		if (focusNodePath == null) return this.loadFocusedNodeTimer.Stop();

		// if more nodes have been rendered, along the path to the focus-node
		const foundBox = this.FindNodeBox(focusNodePath, true);
		const foundPath = foundBox ? foundBox.props.path : "";
		if (foundPath.length > this.lastScrolledToPath.length) {
			if (this.LoadStoredScroll()) {
				this.lastScrolledToPath = foundPath;
			}
		}

		// if (foundPath == focusNodePath && this.scrollView) {
		if (this.lastScrolledToPath == focusNodePath && this.scrollView) {
			this.OnLoadComplete();
			return this.loadFocusedNodeTimer.Stop();
		}
	});
	StartLoadingScroll() {
		/* let playingTimeline = await GetAsync(()=>GetPlayingTimeline(map._id));
		if (!playingTimeline) { */ // only load-scroll if not playing timeline; timeline gets priority, to focus on its latest-revealed nodes
		this.lastScrolledToPath = "";
		this.loadFocusedNodeTimer.Start();
	}
	OnLoadComplete() {
		console.log(`
			NodeUI render count: ${NodeUI.renderCount} (${NodeUI.renderCount / document.querySelectorAll(".NodeUI").length} per visible node)
			TimeSincePageLoad: ${Date.now() - performance.timing.domComplete}ms
		`.AsMultiline(0));
		this.LoadStoredScroll();
		// UpdateURL(false);
	}

	PostRender() {
		const {withinPage} = this.props;
		const map = this.Map;
		/* if (withinPage && this.scrollView) {
			this.scrollView.vScrollableDOM = $('#HomeScrollView').children('.content')[0];
		} */
		if (map) {
			SetMapVisitTimeForThisSession(map.id, Date.now());
		}
	}

	// load scroll from store
	LoadStoredScroll() {
		const map = this.Map;
		if (map == null) return false;
		if (this.scrollView == null) return false;
		// if user is already scrolling manually, don't interrupt (but count as successful scroll)
		if (this.scrollView.state.scrollOp_bar) return true;
		// if (this.scrollView.state.scrollOp_bar) return false;

		const focusNode_target = GetFocusedNodePath(GetMapView(map.id)); // || map.rootNode.toString();
		if (focusNode_target == null) return false;
		// Log(`FocusNode_target:${focusNode_target}`);
		return this.ScrollToNode(focusNode_target);
	}

	FindNodeBox(nodePath: string, ifMissingFindAncestor = false) {
		const nodeUIs = Array.from(document.querySelectorAll(".NodeUI_Inner")).map(nodeUI_boxEl=>{
			const boxEl = FindReact(nodeUI_boxEl) as ExpandableBox;
			const result = boxEl.props.parent as NodeUI_Inner;
			Assert(result instanceof NodeUI_Inner);
			return result;
		});

		let targetNodeUI: NodeUI_Inner|n;
		let nextPathTry = nodePath;
		while (targetNodeUI == null) {
			targetNodeUI = nodeUIs.FirstOrX(nodeUI=>{ // eslint-disable-line
				const {node, path} = nodeUI.props;
				const parentPath = GetParentPath(path);
				const parent = GetParentNodeL3(path);
				const isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);
				return path == nextPathTry || (isPremiseOfSinglePremiseArg && parentPath == nextPathTry);
			});
			// if finding ancestors is disabled, or there are no ancestors left, stop up-search
			if (!ifMissingFindAncestor || !nextPathTry.Contains("/")) break;
			nextPathTry = nextPathTry.substr(0, nextPathTry.lastIndexOf("/"));
		}
		// if (targetNodeUI == null) Log(`Failed to find node-box for: ${nodePath}`);
		return targetNodeUI;
	}
	ScrollToNode(nodePath: string) {
		const map = this.Map;
		if (map == null) return;

		const viewOffset_target = GetViewOffset(GetMapView(map.id)); // || new Vector2(200, 0);
		// Log(`LoadingScroll:${nodePath};${ToJSON(viewOffset_target)}`);
		if (nodePath == null || viewOffset_target == null) return true; // if invalid entry, count as success?

		const focusNodeBox = this.FindNodeBox(nodePath, true);
		if (focusNodeBox == null) return false;
		const focusNodeBoxCenter = GetViewportRect(NN(GetDOM(focusNodeBox))).Center.Minus(GetViewportRect(NN(this.mapUIEl)).Position);
		this.ScrollToPosition_Center(focusNodeBoxCenter.Plus(viewOffset_target));
		return true;
	}
	ScrollToPosition_Center(posInContainer: Vector2) {
		const {withinPage} = this.props;
		Assert(this.scrollView);
		//const scrollContainerViewportSize = new Vector2(this.scrollView.vScrollableDOM.getBoundingClientRect().width, this.scrollView.vScrollableDOM.getBoundingClientRect().height);
		const scrollContainerViewportSize = GetViewportRect(GetDOM(this.scrollView.content)!).Size;
		const topBarsHeight = window.innerHeight - scrollContainerViewportSize.y;

		const oldScroll = this.scrollView.GetScroll();
		const newScroll = new Vector2(
			posInContainer.x - (scrollContainerViewportSize.x / 2),
			// scroll down a bit extra, such that node is center of window, not center of scroll-view container/viewport (I've tried both, and this way is more centered "perceptually")
			(posInContainer.y - (scrollContainerViewportSize.y / 2)) + (topBarsHeight / 2),
		);
		if (withinPage) { // if within a page, don't apply stored vertical-scroll
			newScroll.y = oldScroll.y;
		}
		console.log("Loading scroll:", newScroll);
		this.scrollView!.SetScroll(newScroll);
		// Log("Scrolling to position: " + newScroll);

		/* if (nextPathTry == nodePath)
			this.hasLoadedScroll = true; */
	}

	ScrollToMakeRectVisible(targetRect: VRect, padding = 0, stopLoadingStoredScroll = true) {
		if (padding != 0) targetRect = targetRect.Grow(padding);
		Assert(this.scrollView && this.mapUIEl);

		const mapUIBackgroundRect = GetViewportRect(this.mapUIEl);
		const oldScroll = this.scrollView.GetScroll();
		const viewportRect = GetViewportRect(GetDOM(this.scrollView.content)!).NewPosition(a=>a.Minus(mapUIBackgroundRect));

		const newViewportRect = viewportRect.Clone();
		if (targetRect.Left < newViewportRect.Left) newViewportRect.x = targetRect.x; // if target-rect extends further left, reposition left
		if (targetRect.Right > newViewportRect.Right) newViewportRect.x = targetRect.Right - newViewportRect.width; // if target-rect extends further right, reposition right
		if (targetRect.Top < newViewportRect.Top) newViewportRect.y = targetRect.y; // if target-rect extends further up, reposition up
		if (targetRect.Bottom > newViewportRect.Bottom) newViewportRect.y = targetRect.Bottom - newViewportRect.height; // if target-rect extends further down, reposition down

		const scrollNeededToEnactNewViewportRect = newViewportRect.Position.Minus(viewportRect.Position);
		const newScroll = new Vector2(oldScroll).Plus(scrollNeededToEnactNewViewportRect);
		console.log("Loading scroll:", newScroll, "@TargetRect", targetRect);
		this.scrollView.SetScroll(newScroll);

		// the loadFocusedNodeTimer keeps running until it scrolls to the stored "focused node"
		// if timeline is playing, focused-node is concealed, so timer keeps running
		// this conflicts with the timeline's scrolling, so cancel the load-stored-focused-node timer
		if (stopLoadingStoredScroll) this.loadFocusedNodeTimer.Stop();
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