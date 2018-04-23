import {GetViewOffset, GetSelectedNodePath, GetNodeView, GetMapView, GetFocusedNodePathNodes, GetFocusedNodePath} from "../../../Store/main/mapViews";
import {BaseComponent, FindDOM, FindReact, GetInnerComp, BaseComponentWithConnector} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {connect} from "react-redux";
import {DBPath, GetData} from "../../../Frame/Database/DatabaseHelpers";
import {Debugger, inFirefox} from "../../../Frame/General/Others";
import {E} from "js-vextensions";
import {Vector2i, VRect} from "js-vextensions";
import {NodeUI} from "./MapNode/NodeUI";
import {ScrollView} from "react-vscrollview";
import {GetDistanceBetweenRectAndPoint} from "../../../Frame/General/Geometry";
import {NodeUI_Inner} from "./MapNode/NodeUI_Inner";
//import ReactResizeDetector from "react-resize-detector"; // this one doesn't seem to work reliably -- at least for the map-ui
import ResizeSensor from "react-resize-sensor";
import {WaitXThenRun, Timer, SleepAsync} from "js-vextensions";
import {MapNode, ClaimForm, MapNodeL2, MapNodeL3} from "../../../Store/firebase/nodes/@MapNode";
import {Map, MapType} from "../../../Store/firebase/maps/@Map";
import {RootState} from "../../../Store/index";
import {GetUserID} from "../../../Store/firebase/users";
import {ACTMapNodeSelect, ACTViewCenterChange} from "../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {Column} from "react-vcomponents";
import {GetNode, GetNodeChildren} from "../../../Store/firebase/nodes";
import {Row} from "react-vcomponents";
import Link from "../../../Frame/ReactComponents/Link";
import {VURL} from "js-vextensions";
import NodeUI_ForBots from "./MapNode/NodeUI_ForBots";
import {IsNumberString} from "js-vextensions";
import {GetNodeL3, IsNodeL2, IsNodeL3} from "../../../Store/firebase/nodes/$node";
import {GetOpenMapID, ACTSetInitialChildLimit} from "../../../Store/main";
import {colors, styles} from "../../../Frame/UI/GlobalStyles";
import {Button} from "react-vcomponents";
import {DropDown} from "react-vcomponents";
import {Spinner} from "react-vcomponents";
import {ACTDebateMapSelect} from "../../../Store/main/debates";
import MapDetailsUI from "./MapDetailsUI";
import UpdateMapDetails from "../../../Server/Commands/UpdateMapDetails";
import {IsUserCreatorOrMod} from "../../../Store/firebase/userExtras";
import {ShowMessageBox} from "react-vmessagebox";
import DeleteMap from "../../../Server/Commands/DeleteMap";
import InfoButton from "../../../Frame/ReactComponents/InfoButton";
import {GetChildCount} from "Store/firebase/nodes";
import {ActionBar_Left} from "./MapUI/ActionBar_Left";
import {ActionBar_Right} from "./MapUI/ActionBar_Right";
import {VMenuStub} from "react-vmenu";
import {VMenuItem} from "react-vmenu/dist/VMenu";
import {emptyArray} from "../../../Frame/Store/ReducerUtils";
import { TimelinePlayerUI, TimelineOverlayUI } from "UI/@Shared/Maps/MapUI/TimelinePlayerUI";
import {GetAsync} from "Frame/Database/DatabaseHelpers";
import {GetPlayingTimeline} from "../../../Store/main/maps/$map";
import { StandardCompProps } from "Frame/UI/General";

export function GetNodeBoxForPath(path: string) {
	return $(".NodeUI_Inner").ToList().FirstOrX(a=>FindReact(a[0]).props.path == path);
}
export function GetNodeBoxClosestToViewCenter() {
	let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
	return $(".NodeUI_Inner").ToList().Min(nodeBox=>GetDistanceBetweenRectAndPoint(nodeBox.GetScreenRect(), viewCenter_onScreen));
}
export function GetViewOffsetForNodeBox(nodeBox: JQuery) {
	let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
	return viewCenter_onScreen.Minus(nodeBox.GetScreenRect().Position).NewX(x=>x.RoundTo(1)).NewY(y=>y.RoundTo(1));
}

export function UpdateFocusNodeAndViewOffset(mapID: number) {
	/*let selectedNodePath = GetSelectedNodePath(mapID);
	let focusNodeBox = selectedNodePath ? GetNodeBoxForPath(selectedNodePath) : GetNodeBoxClosestToViewCenter();*/
	let focusNodeBox = GetNodeBoxClosestToViewCenter();
	if (focusNodeBox == null) return; // can happen if node was just deleted

	let focusNodeBoxComp = FindReact(focusNodeBox[0]) as NodeUI_Inner;
	let focusNodePath = focusNodeBoxComp.props.path;
	if (focusNodePath == null) return; // can happen sometimes; not sure what causes
	let viewOffset = GetViewOffsetForNodeBox(focusNodeBox);

	let oldNodeView = GetNodeView(mapID, focusNodePath);
	if (oldNodeView == null || !oldNodeView.focused || !viewOffset.Equals(oldNodeView.viewOffset)) {
		store.dispatch(new ACTViewCenterChange({mapID, focusNodePath, viewOffset}));
	}
}

type Props = {
	map: Map, rootNode?: MapNodeL3, withinPage?: boolean,
	padding?: {left: number, right: number, top: number, bottom: number},
	subNavBarWidth?: number,
} & React.HTMLProps<HTMLDivElement>;
let connector = (state: RootState, {map, rootNode}: Props)=> {
	if (rootNode == null && map && map.rootNode) {
		rootNode = GetNodeL3(map.rootNode+"");
	}

	if (map) {
		let nodeID = State("main", "mapViews", map._id, "bot_currentNodeID");
		if (isBot && nodeID) {
			rootNode = GetNodeL3(nodeID+"");
		}
	}

	return {
		rootNode,
		/*focusNode: GetMapView(state, {map}) ? GetMapView(state, {map}).focusNode : null,
		viewOffset: GetMapView(state, {map}) ? GetMapView(state, {map}).viewOffset : null,*/
		/*focusNode_available: (GetMapView(state, {map}) && GetMapView(state, {map}).focusNode) != null,
		viewOffset_available: (GetMapView(state, {map}) && GetMapView(state, {map}).viewOffset) != null,*/
	};
};
@Connect(connector)
export class MapUI extends BaseComponentWithConnector(connector, {}) {
	//static defaultProps = {padding: {left: 2000, right: 2000, top: 1000, bottom: 1000}};
	static defaultProps = {
		padding: {left: screen.availWidth, right: screen.availWidth, top: screen.availHeight, bottom: screen.availHeight},
		subNavBarWidth: 0,
	};
	static ValidateProps(props) {
		let {rootNode} = props;
		if (rootNode) {
			Assert(IsNodeL2(rootNode), "Node supplied to MapUI is not level-2!");
			Assert(IsNodeL3(rootNode), "Node supplied to MapUI is not level-3!");
		}
	}

	scrollView: ScrollView;
	mapUI: HTMLDivElement;
	downPos: Vector2i;
	render() {
		let {map, rootNode, withinPage, padding, subNavBarWidth, ...rest} = this.props;
		if (map == null) {
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", flex: 1, fontSize: 25}}>Loading map...</div>;
		}
		Assert(map._id, "map._id is null!");
		if (rootNode == null) {
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", flex: 1, fontSize: 25}}>Loading root node...</div>;
		}

		if (isBot) {
			return <NodeUI_ForBots map={map} node={rootNode}/>;
		}

		return (
			<Column style={{flex: 1, maxHeight: "100%" /* for ff */ }}>
				{!withinPage &&
					<ActionBar_Left map={map} subNavBarWidth={subNavBarWidth}/>}
				{!withinPage &&
					<ActionBar_Right map={map} subNavBarWidth={subNavBarWidth}/>}
				{!withinPage &&
					<TimelinePlayerUI map={map}/>}
				{/*!withinPage &&
					<TimelineOverlayUI map={map}/>*/}
				<ScrollView {...rest.Excluding(...StandardCompProps())} ref={c=>this.scrollView = c}
						backgroundDrag={true} backgroundDragMatchFunc={a=>a == FindDOM(this.scrollView.content) || a == this.mapUI}
						style={E({flex: 1}, withinPage && {overflow: "visible"})}
						scrollHBarStyle={E({height: 10}, withinPage && {display: "none"})} scrollVBarStyle={E({width: 10}, withinPage && {display: "none"})}
						contentStyle={E(
							{willChange: "transform"},
							withinPage && {position: "relative", marginBottom: -300, paddingBottom: 300},
							withinPage && inFirefox && {overflow: "hidden"},
						)}
						//contentStyle={E({willChange: "transform"}, withinPage && {marginTop: -300, paddingBottom: 300, transform: "translateY(300px)"})}
						//bufferScrollEventsBy={10000}
						onScrollEnd={pos=> {
							//if (withinPage) return;
							UpdateFocusNodeAndViewOffset(map._id);
						}}>
					<style>{`
					.MapUI { display: inline-flex; flex-wrap: wrap; }
					.MapUI.scrolling > * { pointer-events: none; }
					`}</style>
					<div className="MapUI" ref={c=>this.mapUI = c}
							style={{
								position: "relative", /*display: "flex",*/ whiteSpace: "nowrap",
								padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
								filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))",
							}}
							onMouseDown={e=>{
								this.downPos = new Vector2i(e.clientX, e.clientY);
								if (e.button == 1)
									$(FindDOM(this.mapUI)).addClass("scrolling");
							}}
							onMouseUp={e=> {
								$(FindDOM(this.mapUI)).removeClass("scrolling");
							}}
							onClick={e=> {
								if (e.target != this.mapUI) return;
								if (new Vector2i(e.clientX, e.clientY).DistanceTo(this.downPos) >= 3) return;
								let mapView = GetMapView(GetOpenMapID());
								if (GetSelectedNodePath(map._id)) {
									store.dispatch(new ACTMapNodeSelect({mapID: map._id, path: null}));
									//UpdateFocusNodeAndViewOffset(map._id);
								}
							}}
							onContextMenu={e=> {
								if (e.nativeEvent["passThrough"]) return true;
								e.preventDefault();
							}}>
						<NodeUI map={map} node={rootNode} path={Assert(rootNode._id != null) || rootNode._id.toString()}/>
						{/*<ReactResizeDetector handleWidth handleHeight onResize={()=> {*/}
						{/*<ResizeSensor ref="resizeSensor" onResize={()=> {
							this.LoadScroll();
						}}/>*/}
						<VMenuStub preOpen={e=>e.passThrough != true}>
							<VMenuItem text="(To add a node, right click on an existing node.)" style={styles.vMenuItem}/>
						</VMenuStub>
					</div>
				</ScrollView>
			</Column>
		);
	}

	async ComponentDidMount() {
		NodeUI.renderCount = 0;
		/*NodeUI.lastRenderTime = Date.now();
		let lastRenderCount = 0;*/
		
		for (var i = 0; i < 30 && this.props.map == null; i++) await SleepAsync(100);
		let {map} = this.props;
		if (map == null) return;

		/*let playingTimeline = await GetAsync(()=>GetPlayingTimeline(map._id));
		if (!playingTimeline) {*/ // only load-scroll if not playing timeline; timeline gets priority, to focus on its latest-revealed nodes
			
		/*
		let timer = new Timer(100, ()=> {
			if (!this.mounted) return timer.Stop();

			// if more nodes have been rendered (ie, new nodes have come in)
			if (NodeUI.renderCount > lastRenderCount) {
				this.LoadScroll();
			}
			lastRenderCount = NodeUI.renderCount;

			let timeSinceLastNodeUIRender = Date.now() - NodeUI.lastRenderTime;
			if (NodeUI.renderCount > 0 && timeSinceLastNodeUIRender >= 1500) {
				this.OnLoadComplete();
				timer.Stop();
			}
		}).Start();*/

		let focusNodePath = GetFocusedNodePath(map._id);

		let lastFoundPath = "";
		let timer = new Timer(100, ()=> {
			if (!this.mounted) return timer.Stop();

			// if more nodes have been rendered, along the path to the focus-node
			let foundBox = this.FindNodeBox(focusNodePath, true);
			let foundPath = foundBox ? foundBox.props.path : "";
			if (foundPath.length > lastFoundPath.length) {
				this.LoadScroll();
			}
			lastFoundPath = foundPath;

			if (foundPath == focusNodePath && this.scrollView) {
				this.OnLoadComplete();
				timer.Stop();
			}
		}).Start();
		//}

		// start scroll at root // (this doesn't actually look as good)
		/*if (this.scrollView)
			this.scrollView.ScrollBy({x: MapUI.padding.leftAndRight, y: MapUI.padding.topAndBottom});*/
	}
	OnLoadComplete() {
		console.log(`NodeUI render count: ${NodeUI.renderCount} (${NodeUI.renderCount / $(".NodeUI").length} per visible node)`);
		this.LoadScroll();
		//UpdateURL(false);
	}

	PostRender() {
		let {map, withinPage} = this.props;
		if (withinPage && this.scrollView) {
			this.scrollView.vScrollableDOM =  $("#HomeScrollView").children(".content")[0];
		}
		if (map) {
			SetMapVisitTimeForThisSession(map._id, Date.now());
		}
	}

	// load scroll from store
	LoadScroll() {
		let {map, rootNode, withinPage} = this.props;
		if (this.scrollView == null) return;
		if (this.scrollView.state.scrollOp_bar) return; // if user is already scrolling manually, don't interrupt

		let focusNode_target = GetFocusedNodePath(GetMapView(map._id)); // || map.rootNode.toString();
		this.ScrollToNode(focusNode_target);
	}

	FindNodeBox(nodePath: string, ifMissingFindAncestor = false) {
		let focusNodeBox;
		let nextPathTry = nodePath;
		while (focusNodeBox == null) {
			focusNodeBox = $(".NodeUI_Inner").ToList().FirstOrX(nodeBox=> {
				//let comp = FindReact(nodeBox[0]) as NodeUI_Inner;
				let comp = FindReact(nodeBox[0]).props.parent as NodeUI_Inner;
				// if comp is null, just ignore (an error must have occured, but we don't want to handle it here)
				if (comp == null) return false;
				return comp.props.path == nextPathTry;
			});
			if (!ifMissingFindAncestor || !nextPathTry.Contains("/")) break;
			nextPathTry = nextPathTry.substr(0, nextPathTry.lastIndexOf("/"));
		}
		if (focusNodeBox == null) return null;
		return FindReact(focusNodeBox[0]).props.parent as NodeUI_Inner;
	}
	ScrollToNode(nodePath: string) {
		let {map, rootNode, withinPage} = this.props;

		let viewOffset_target = GetViewOffset(GetMapView(map._id)); // || new Vector2i(200, 0);
		//Log(`LoadingScroll:${nodePath};${ToJSON(viewOffset_target)}`);
		if (nodePath == null || viewOffset_target == null) return;
		
		let focusNodeBox = this.FindNodeBox(nodePath, true);
		if (focusNodeBox == null) return;
		let focusNodeBoxPos = $(FindDOM(focusNodeBox)).GetScreenRect().Center.Minus($(this.mapUI).GetScreenRect().Position);
		this.ScrollToPosition(focusNodeBoxPos);
	}
	ScrollToPosition(posInContainer: Vector2i) {
		let {map, rootNode, withinPage} = this.props;
		
		let oldScroll = this.scrollView.GetScroll();
		let newScroll = new Vector2i(posInContainer.x - (window.innerWidth / 2), posInContainer.y - (window.innerHeight / 2));
		if (withinPage) { // if within a page, don't apply stored vertical-scroll
			newScroll.y = oldScroll.y;
		}
		this.scrollView.SetScroll(newScroll);
		//Log("Scrolling to position: " + newScroll);

		/*if (nextPathTry == nodePath)
			this.hasLoadedScroll = true;*/
	}
}

window.addEventListener("beforeunload", ()=> {
	let mapID = GetOpenMapID();
	SetMapVisitTimeForThisSession(mapID, Date.now());
});

function SetMapVisitTimeForThisSession(mapID: number, time: number) {
	if (mapID == null) return;
	let lastMapViewTimes = FromJSON(localStorage.getItem("lastMapViewTimes_" + mapID) || `[${Date.now()}]`) as number[];

	let mapsViewedThisSession = g.mapsViewedThisSession || {};
	if (mapsViewedThisSession[mapID] == null) {
		lastMapViewTimes.Insert(0, Date.now());
		if (lastMapViewTimes.length > 10) lastMapViewTimes.splice(-1, 1);
	} else {
		lastMapViewTimes[0] = Date.now();
	}
	
	localStorage.setItem("lastMapViewTimes_" + mapID, ToJSON(lastMapViewTimes));
	mapsViewedThisSession[mapID] = true;
	G({mapsViewedThisSession});
}