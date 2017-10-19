import {GetViewOffset, GetSelectedNodePath, GetNodeView, GetMapView, GetFocusedNodePathNodes, GetFocusedNodePath} from "../../../Store/main/mapViews";
import {BaseComponent, FindDOM, FindReact, FindDOM_, Pre, GetInnerComp} from "../../../Frame/UI/ReactGlobals";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {connect} from "react-redux";
import {DBPath, GetData} from "../../../Frame/Database/DatabaseHelpers";
import {Debugger, E, inFirefox} from "../../../Frame/General/Globals_Free";
import {PropTypes} from "react";
import V from "../../../Frame/V/V";
import {GetTreeNodesInObjTree} from "../../../Frame/V/V";
import {Vector2i, VRect} from "../../../Frame/General/VectorStructs";
import NodeUI from "./MapNode/NodeUI";
import ScrollView from "react-vscrollview";
import {GetDistanceBetweenRectAndPoint} from "../../../Frame/General/Geometry";
import NodeUI_Inner from "./MapNode/NodeUI_Inner";
//import ReactResizeDetector from "react-resize-detector"; // this one doesn't seem to work reliably -- at least for the map-ui
import ResizeSensor from "react-resize-sensor";
import {WaitXThenRun, Timer} from "../../../Frame/General/Timers";
import {MapNode, ThesisForm, MapNodeEnhanced} from "../../../Store/firebase/nodes/@MapNode";
import {Map, MapType} from "../../../Store/firebase/maps/@Map";
import {RootState} from "../../../Store/index";
import {GetUserID} from "../../../Store/firebase/users";
import {ACTMapNodeSelect, ACTViewCenterChange} from "../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import Column from "../../../Frame/ReactComponents/Column";
import {GetNode, GetNodeChildren} from "../../../Store/firebase/nodes";
import Row from "../../../Frame/ReactComponents/Row";
import Link from "../../../Frame/ReactComponents/Link";
import {URL} from "../../../Frame/General/URLs";
import NodeUI_ForBots from "./MapNode/NodeUI_ForBots";
import {IsNumberString} from "../../../Frame/General/Types";
import {GetNodeEnhanced} from "../../../Store/firebase/nodes/$node";
import {GetOpenMapID, ACTSetInitialChildLimit} from "../../../Store/main";
import {colors, styles} from "../../../Frame/UI/GlobalStyles";
import Button from "Frame/ReactComponents/Button";
import DropDown from "../../../Frame/ReactComponents/DropDown";
import {DropDownTrigger, DropDownContent} from "../../../Frame/ReactComponents/DropDown";
import Spinner from "../../../Frame/ReactComponents/Spinner";
import {ACTDebateMapSelect} from "../../../Store/main/debates";
import MapDetailsUI from "./MapDetailsUI";
import {GetUpdates} from "../../../Frame/General/Others";
import UpdateMapDetails from "../../../Server/Commands/UpdateMapDetails";
import {IsUserCreatorOrMod} from "../../../Store/firebase/userExtras";
import {ShowMessageBox} from "../../../Frame/UI/VMessageBox";
import DeleteMap from "../../../Server/Commands/DeleteMap";
import InfoButton from "../../../Frame/ReactComponents/InfoButton";
import { GetNodeAsync, GetChildCount } from "Store/firebase/nodes";
import {ActionBar_Left} from "./MapUI/ActionBar_Left";
import {ActionBar_Right} from "./MapUI/ActionBar_Right";
import {VMenuStub} from "react-vmenu";
import {VMenuItem} from "react-vmenu/dist/VMenu";
import {emptyArray} from "../../../Frame/Store/ReducerUtils";
import { TimelinePlayerUI, TimelineOverlayUI } from "UI/@Shared/Maps/MapUI/TimelinePlayerUI";

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
	let viewOffset = GetViewOffsetForNodeBox(focusNodeBox);

	let oldNodeView = GetNodeView(mapID, focusNodePath);
	if (oldNodeView == null || !oldNodeView.focused || !viewOffset.Equals(oldNodeView.viewOffset))
		store.dispatch(new ACTViewCenterChange({mapID, focusNodePath, viewOffset}));
}

type Props = {
	map: Map, rootNode?: MapNode, withinPage?: boolean,
	padding?: {left: number, right: number, top: number, bottom: number},
	subNavBarWidth?: number,
} & React.HTMLProps<HTMLDivElement>
	& Partial<{rootNode: MapNodeEnhanced, focusNode: string, viewOffset: {x: number, y: number}}>;
@Connect((state: RootState, {map, rootNode}: Props)=> {
	if (rootNode == null && map && map.rootNode) {
		rootNode = GetNodeEnhanced(GetNode(map.rootNode), map.rootNode+"");
	}

	if (map) {
		let nodeID = State("main", "mapViews", map._id, "rootNodeID");
		if (isBot && nodeID) {
			rootNode = GetNodeEnhanced(GetNode(nodeID), nodeID+"");
		}
	}

	return {
		rootNode,
		/*focusNode: GetMapView(state, {map}) ? GetMapView(state, {map}).focusNode : null,
		viewOffset: GetMapView(state, {map}) ? GetMapView(state, {map}).viewOffset : null,*/
		/*focusNode_available: (GetMapView(state, {map}) && GetMapView(state, {map}).focusNode) != null,
		viewOffset_available: (GetMapView(state, {map}) && GetMapView(state, {map}).viewOffset) != null,*/
	};
})
export default class MapUI extends BaseComponent<Props, {} | void> {
	//static defaultProps = {padding: {left: 2000, right: 2000, top: 1000, bottom: 1000}};
	static defaultProps = {
		padding: {left: screen.availWidth, right: screen.availWidth, top: screen.availHeight, bottom: screen.availHeight},
		subNavBarWidth: 0,
	};

	scrollView: ScrollView;
	mapUI: HTMLDivElement;
	downPos: Vector2i;
	render() {
		let {map, rootNode, withinPage, padding, subNavBarWidth, ...rest} = this.props;
		if (map == null)
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", flex: 1, fontSize: 25}}>Loading map...</div>;
		Assert(map._id, "map._id is null!");
		if (rootNode == null)
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", flex: 1, fontSize: 25}}>Loading root node...</div>;

		if (isBot) {
			return <NodeUI_ForBots map={map} node={rootNode}/>;
		}

		return (
			<Column style={{flex: 1}}>
				{!withinPage &&
					<ActionBar_Left map={map} subNavBarWidth={subNavBarWidth}/>}
				{!withinPage &&
					<ActionBar_Right map={map} subNavBarWidth={subNavBarWidth}/>}
				{!withinPage &&
					<TimelinePlayerUI map={map}/>}
				{!withinPage &&
					<TimelineOverlayUI map={map}/>}
				<ScrollView {...rest.Excluding("dispatch")} ref={c=>this.scrollView = c}
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
									FindDOM_(this.mapUI).addClass("scrolling");
							}}
							onMouseUp={e=> {
								FindDOM_(this.mapUI).removeClass("scrolling");
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

	ComponentDidMount() {
		NodeUI.renderCount = 0;
		NodeUI.lastRenderTime = Date.now();
		let lastRenderCount = 0;
		let timer = new Timer(100, ()=> {
			if (!this.mounted) return timer.Stop();

			// if more nodes have been rendered (ie, new nodes have come in)
			if (NodeUI.renderCount > lastRenderCount)
				this.LoadScroll();
			lastRenderCount = NodeUI.renderCount;

			let timeSinceLastNodeUIRender = Date.now() - NodeUI.lastRenderTime;
			if (NodeUI.renderCount > 0 && timeSinceLastNodeUIRender >= 1500) {
				this.OnLoadComplete();
				timer.Stop();
			}
		}).Start();

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
		let {withinPage} = this.props;
		if (withinPage && this.scrollView)
			this.scrollView.vScrollableDOM =  $("#HomeScrollView").children(".content")[0];
	}

	// load scroll from store
	LoadScroll() {
		let {map, rootNode, withinPage} = this.props;
		if (this.scrollView == null) return;

		// if user is already scrolling manually, return so we don't interrupt that process
		if (this.scrollView.state.scrollOp_bar) return;

		let focusNode_target = GetFocusedNodePath(GetMapView(map._id)); // || map.rootNode.toString();
		let viewOffset_target = GetViewOffset(GetMapView(map._id)); // || new Vector2i(200, 0);
		//Log(`LoadingScroll:${focusNode_target};${ToJSON(viewOffset_target)}`);
		if (focusNode_target == null || viewOffset_target == null) return;

		let focusNodeBox;
		let nextPathTry = focusNode_target;
		while (true) {
			focusNodeBox = $(".NodeUI_Inner").ToList().FirstOrX(nodeBox=>(FindReact(nodeBox[0]) as NodeUI_Inner).props.path == nextPathTry);
			if (focusNodeBox || !nextPathTry.Contains("/")) break;
			nextPathTry = nextPathTry.substr(0, nextPathTry.lastIndexOf("/"));
		}
		if (focusNodeBox == null) return;

		let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
		let viewOffset_current = viewCenter_onScreen.Minus(focusNodeBox.GetScreenRect().Position);
		let viewOffset_changeNeeded = new Vector2i(viewOffset_target).Minus(viewOffset_current);
		if (withinPage) { // if within a page, don't apply stored vertical-scroll
			viewOffset_changeNeeded.y = 0;
		}
		this.scrollView.ScrollBy(viewOffset_changeNeeded);
		//Log("Loading scroll: " + Vector2i.prototype.toString.call(viewOffset_target));

		/*if (nextPathTry == focusNode_target)
			this.hasLoadedScroll = true;*/
	}
}