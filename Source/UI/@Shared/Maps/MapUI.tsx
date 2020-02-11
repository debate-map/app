import {StandardCompProps} from "Source/Utils/UI/General";
import {DeepGet, E, SleepAsync, Timer, Vector2i, FindDOMAll, Assert, FromJSON, ToJSON, VRect, GetTreeNodesInObjTree} from "js-vextensions";
import {Column, Row} from "react-vcomponents";
import {BaseComponentWithConnector, FindReact, GetDOM, BaseComponentPlus, BaseComponent} from "react-vextensions";
import {VMenuStub, VMenuItem} from "react-vmenu";

import {ScrollView} from "react-vscrollview";
import {TimelinePlayerUI} from "Source/UI/@Shared/Timelines/TimelinePlayerUI";
import {GetDistanceBetweenRectAndPoint, inFirefox, GetScreenRect, StoreAction, Observer} from "vwebapp-framework";
import {GADDemo} from "Source/UI/@GAD/GAD";
import {ActionBar_Left_GAD} from "Source/UI/@GAD/ActionBar_Left_GAD";
import {ActionBar_Right_GAD} from "Source/UI/@GAD/ActionBar_Right_GAD";
import {store} from "Source/Store";
import {GetNodeView, GetMapView, GetSelectedNodePath, GetViewOffset, GetFocusedNodePath, GetNodeViewsAlongPath, ACTMapNodeSelect} from "Source/Store/main/maps/mapViews/$mapView";
import {GetTimelinePanelOpen, GetPlayingTimeline, GetMapState} from "Source/Store/main/maps/mapStates/$mapState";
import {GetOpenMapID} from "Source/Store/main";
import {TimelinePanel} from "Source/UI/@Shared/Timelines/TimelinePanel";
import {TimelineIntroBox} from "Source/UI/@Shared/Timelines/TimelineIntroBox";
import {styles, ES} from "../../../Utils/UI/GlobalStyles";
import {NodeUI} from "./MapNode/NodeUI";
import {NodeUI_ForBots} from "./MapNode/NodeUI_ForBots";
import {NodeUI_Inner} from "./MapNode/NodeUI_Inner";
import {ActionBar_Left} from "./MapUI/ActionBar_Left";
import {ActionBar_Right} from "./MapUI/ActionBar_Right";
import {ExpandableBox} from "./MapNode/ExpandableBox";
import {MapNodeL3} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/@MapNode";
import {IsNodeL2, IsNodeL3, GetNodeL3, IsPremiseOfSinglePremiseArgument} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/$node";
import {GetParentPath, GetParentNodeL3} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes";
import {Map} from "Subrepos/Server/Source/@Shared/Store/firebase/maps/@Map";


export function GetNodeBoxForPath(path: string) {
	const nodeInnerBoxes = FindDOMAll(".NodeUI_Inner").map(a=>DeepGet(FindReact(a), "props/parent") as NodeUI_Inner);
	return nodeInnerBoxes.FirstOrX(a=>a.props.path == path);
}
export function GetNodeBoxClosestToViewCenter() {
	const viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
	return FindDOMAll(".NodeUI_Inner").Min(nodeBox=>GetDistanceBetweenRectAndPoint($(nodeBox).GetScreenRect(), viewCenter_onScreen));
}
export function GetViewOffsetForNodeBox(nodeBox: Element) {
	const viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
	return viewCenter_onScreen.Minus($(nodeBox).GetScreenRect().Position).NewX(x=>x.RoundTo(1)).NewY(y=>y.RoundTo(1));
}

export const ACTUpdateFocusNodeAndViewOffset = StoreAction((mapID: string)=>{
	// unfocus the old focused node
	const {rootNodeViews} = GetMapView(mapID);
	const nodes = GetTreeNodesInObjTree(rootNodeViews, true);
	const oldFocusNode = nodes.FirstOrX(a=>a.Value && a.Value.focused);
	if (oldFocusNode) {
		oldFocusNode.Value.focused = false;
		oldFocusNode.Value.viewOffset = null;
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
export const ACTSetFocusNodeAndViewOffset = StoreAction((mapID: string, focusNodePath: string | string[], viewOffset: Vector2i)=>{
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
			<div style={ES({display: "flex", alignItems: "center", justifyContent: "center", flex: 1, fontSize: 25})}>
				{message}
			</div>
		);
	}
}

type Props = {
	map: Map, rootNode?: MapNodeL3, withinPage?: boolean,
	padding?: {left: number, right: number, top: number, bottom: number},
	subNavBarWidth?: number,
} & React.HTMLProps<HTMLDivElement>;
@Observer
export class MapUI extends BaseComponentPlus({
	// padding: {left: 2000, right: 2000, top: 1000, bottom: 1000}
	padding: {left: screen.availWidth, right: screen.availWidth, top: screen.availHeight, bottom: screen.availHeight},
	subNavBarWidth: 0,
} as Props, {}) {
	private static currentMapUI: MapUI;
	static get CurrentMapUI() { return MapUI.currentMapUI && MapUI.currentMapUI.mounted ? MapUI.currentMapUI : null; }

	static ValidateProps(props) {
		const {rootNode} = props;
		if (rootNode) {
			Assert(IsNodeL2(rootNode), "Node supplied to MapUI is not level-2!");
			Assert(IsNodeL3(rootNode), "Node supplied to MapUI is not level-3!");
		}
	}

	scrollView: ScrollView;
	mapUIEl: HTMLDivElement;
	downPos: Vector2i;
	render() {
		const {map, rootNode: rootNode_passed, withinPage, padding, subNavBarWidth, ...rest} = this.props;
		Assert(map._key, "map._key is null!");

		if (!GetMapState(map._key)?.initDone) return <MapUIWaitMessage message="Initializing map metadata..."/>;
		if (GetMapView(map._key) == null) return <MapUIWaitMessage message="Initializing map view..."/>;
		if (map == null) return <MapUIWaitMessage message="Loading map..."/>;
		const rootNode = (()=>{
			let result = rootNode_passed;
			if (result == null && map && map.rootNode) {
				result = GetNodeL3(`${map.rootNode}`);
			}
			if (isBot && map) {
				const mapView = GetMapView(map._key);
				if (mapView) {
					const nodeID = mapView.bot_currentNodeID;
					if (nodeID) {
						result = GetNodeL3(`${nodeID}`);
					}
				}
			}
			return result;
		})();
		if (rootNode == null) return <MapUIWaitMessage message="Loading root node..."/>;
		// if (GetNodeView(map._key, rootNode._key, false) == null) return <MapUIWaitMessage message="Initializing root-node view..."/>; // maybe temp

		if (isBot) {
			return <NodeUI_ForBots map={map} node={rootNode}/>;
		}

		const timelinePanelOpen = map ? GetTimelinePanelOpen(map._key) : null;
		const playingTimeline = GetPlayingTimeline(map ? map._key : null);

		const ActionBar_Left_Final = GADDemo ? ActionBar_Left_GAD : ActionBar_Left;
		const ActionBar_Right_Final = GADDemo ? ActionBar_Right_GAD : ActionBar_Right;
		return (
			<Column style={ES({flex: 1})}>
				{!withinPage &&
					<ActionBar_Left_Final map={map} subNavBarWidth={subNavBarWidth}/>}
				{!withinPage &&
					<ActionBar_Right_Final map={map} subNavBarWidth={subNavBarWidth}/>}
				{/* !withinPage &&
					<TimelinePlayerUI map={map}/> */}
				{/*! withinPage &&
					<TimelineOverlayUI map={map}/> */}
				<Row style={{marginTop: 30, height: "calc(100% - 30px)", alignItems: "flex-start"}}>
					{!withinPage && timelinePanelOpen &&
						<TimelinePanel map={map}/>}
					<ScrollView {...rest.Excluding(...StandardCompProps() as any)} ref={c=>this.scrollView = c}
						backgroundDrag={true} backgroundDragMatchFunc={a=>a == GetDOM(this.scrollView.content) || a == this.mapUIEl}
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
							ACTUpdateFocusNodeAndViewOffset(map._key);
						}}
					>
						<style>{`
						.MapUI {
							display: inline-flex;
							//flex-wrap: wrap;
						}
						.MapUI.scrolling > * { pointer-events: none; }
						`}</style>
						<div className="MapUI" ref={c=>this.mapUIEl = c}
							style={{
								position: "relative", /* display: "flex", */ whiteSpace: "nowrap",
								padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
								alignItems: "center",
								filter: GADDemo ? "drop-shadow(rgba(0,0,0,.7) 0px 0px 10px)" : "drop-shadow(rgba(0,0,0,1) 0px 0px 10px)",
							}}
							onMouseDown={e=>{
								this.downPos = new Vector2i(e.clientX, e.clientY);
								if (e.button == 2) { $(this.mapUIEl).addClass("scrolling"); }
							}}
							onMouseUp={e=>{
								$(this.mapUIEl).removeClass("scrolling");
							}}
							onClick={e=>{
								if (e.target != this.mapUIEl) return;
								if (this.downPos && new Vector2i(e.clientX, e.clientY).DistanceTo(this.downPos) >= 3) return;
								const mapView = GetMapView(GetOpenMapID());
								if (GetSelectedNodePath(map._key)) {
									ACTMapNodeSelect(map._key, null);
									// UpdateFocusNodeAndViewOffset(map._id);
								}
							}}
							onContextMenu={e=>{
								if (e.nativeEvent["passThrough"]) return true;
								e.preventDefault();
							}}
						>
							{playingTimeline != null &&
							<TimelineIntroBox timeline={playingTimeline}/>}
							<NodeUI indexInNodeList={0} map={map} node={rootNode} path={(Assert(rootNode._key != null), rootNode._key.toString())}/>
							{/* <ReactResizeDetector handleWidth handleHeight onResize={()=> { */}
							{/* <ResizeSensor ref="resizeSensor" onResize={()=> {
								this.LoadScroll();
							}}/> */}
							<VMenuStub delayEventHandler={true} preOpen={e=>e.passThrough != true}>
								<VMenuItem text="(To add a node, right click on an existing node.)" style={styles.vMenuItem}/>
							</VMenuStub>
						</div>
					</ScrollView>
				</Row>
			</Column>
		);
	}

	async ComponentDidMount() {
		MapUI.currentMapUI = this;

		NodeUI.renderCount = 0;
		/* NodeUI.lastRenderTime = Date.now();
		let lastRenderCount = 0; */

		for (let i = 0; i < 30 && this.props.map == null; i++) await SleepAsync(100);
		const {map} = this.props;
		if (map == null) return;

		this.StartLoadingScroll();
	}
	ComponentWillUnmount() {
		MapUI.currentMapUI = null;
	}

	lastScrolledToPath: string;
	loadFocusedNodeTimer = new Timer(100, ()=>{
		if (!this.mounted) return this.loadFocusedNodeTimer.Stop();

		const {map} = this.props;
		const focusNodePath = GetFocusedNodePath(map._key);

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
			NodeUI render count: ${NodeUI.renderCount} (${NodeUI.renderCount / $(".NodeUI").length} per visible node)
			TimeSincePageLoad: ${Date.now() - performance.timing.domComplete}ms
		`.AsMultiline(0));
		this.LoadStoredScroll();
		// UpdateURL(false);
	}

	PostRender() {
		const {map, withinPage} = this.props;
		/* if (withinPage && this.scrollView) {
			this.scrollView.vScrollableDOM = $('#HomeScrollView').children('.content')[0];
		} */
		if (map) {
			SetMapVisitTimeForThisSession(map._key, Date.now());
		}
	}

	// load scroll from store
	LoadStoredScroll() {
		const {map} = this.props;
		if (this.scrollView == null) return false;
		// if user is already scrolling manually, don't interrupt (but count as successful scroll)
		if (this.scrollView.state.scrollOp_bar) return true;
		// if (this.scrollView.state.scrollOp_bar) return false;

		const focusNode_target = GetFocusedNodePath(GetMapView(map._key)); // || map.rootNode.toString();
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

		let targetNodeUI: NodeUI_Inner;
		let nextPathTry = nodePath;
		while (targetNodeUI == null) {
			targetNodeUI = nodeUIs.FirstOrX(nodeUI=>{
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
		const {map} = this.props;

		const viewOffset_target = GetViewOffset(GetMapView(map._key)); // || new Vector2i(200, 0);
		// Log(`LoadingScroll:${nodePath};${ToJSON(viewOffset_target)}`);
		if (nodePath == null || viewOffset_target == null) return true; // if invalid entry, count as success?

		const focusNodeBox = this.FindNodeBox(nodePath, true);
		if (focusNodeBox == null) return false;
		const focusNodeBoxPos = GetScreenRect(GetDOM(focusNodeBox)).Center.Minus(GetScreenRect(this.mapUIEl).Position);
		this.ScrollToPosition_Center(focusNodeBoxPos.Plus(viewOffset_target));
		return true;
	}
	ScrollToPosition_Center(posInContainer: Vector2i) {
		const {withinPage} = this.props;

		const oldScroll = this.scrollView.GetScroll();
		const newScroll = new Vector2i(posInContainer.x - (window.innerWidth / 2), posInContainer.y - (window.innerHeight / 2));
		if (withinPage) { // if within a page, don't apply stored vertical-scroll
			newScroll.y = oldScroll.y;
		}
		Log("Loading scroll:", newScroll);
		this.scrollView.SetScroll(newScroll);
		// Log("Scrolling to position: " + newScroll);

		/* if (nextPathTry == nodePath)
			this.hasLoadedScroll = true; */
	}

	ScrollToMakeRectVisible(targetRect: VRect, padding = 0, stopLoadingStoredScroll = true) {
		if (padding != 0) targetRect = targetRect.Grow(padding);

		const mapUIBackgroundRect = GetScreenRect(this.mapUIEl);
		const oldScroll = this.scrollView.GetScroll();
		const viewportRect = GetScreenRect(GetDOM(this.scrollView.content)).NewPosition(a=>a.Minus(mapUIBackgroundRect));

		const newViewportRect = viewportRect.Clone();
		if (targetRect.Left < newViewportRect.Left) newViewportRect.x = targetRect.x; // if target-rect extends further left, reposition left
		if (targetRect.Right > newViewportRect.Right) newViewportRect.x = targetRect.Right - newViewportRect.width; // if target-rect extends further right, reposition right
		if (targetRect.Top < newViewportRect.Top) newViewportRect.y = targetRect.y; // if target-rect extends further up, reposition up
		if (targetRect.Bottom > newViewportRect.Bottom) newViewportRect.y = targetRect.Bottom - newViewportRect.height; // if target-rect extends further down, reposition down

		const scrollNeededToEnactNewViewportRect = newViewportRect.Position.Minus(viewportRect.Position);
		const newScroll = new Vector2i(oldScroll).Plus(scrollNeededToEnactNewViewportRect);
		Log("Loading scroll:", newScroll, "@TargetRect", targetRect);
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

function SetMapVisitTimeForThisSession(mapID: string, time: number) {
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