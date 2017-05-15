import {GetFocusNode, GetViewOffset, GetSelectedNodePath, GetNodeView, GetMapView} from "../../../Store/main/mapViews";
import {BaseComponent, FindDOM, FindReact, FindDOM_, Pre} from "../../../Frame/UI/ReactGlobals";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {Route} from "react-router-dom";
import {connect} from "react-redux";
import {DBPath, GetData} from "../../../Frame/Database/DatabaseHelpers";
import {Debugger, E} from "../../../Frame/General/Globals_Free";
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
import {Map} from "../../../Store/firebase/maps/@Map";
import {RootState} from "../../../Store/index";
import {GetUserID} from "../../../Store/firebase/users";
import {ACTMapNodeSelect, ACTViewCenterChange} from "../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {UpdateURL} from "../../../Frame/URL/URLManager";
import Column from "../../../Frame/ReactComponents/Column";
import {GetNode} from "../../../Store/firebase/nodes";
import Row from "../../../Frame/ReactComponents/Row";
import Link from "../../../Frame/ReactComponents/Link";
import {URL} from "../../../Frame/General/URLs";
import NodeUI_ForBots from "./MapNode/NodeUI_ForBots";
import {IsNumberString} from "../../../Frame/General/Types";
import {GetNodeEnhanced} from "../../../Store/firebase/nodes/$node";
import {GetOpenMapID, ACTSetInitialChildLimit} from "../../../Store/main";
import {colors} from "../../../Frame/UI/GlobalStyles";
import Button from "Frame/ReactComponents/Button";
import DropDown from "../../../Frame/ReactComponents/DropDown";
import {DropDownTrigger, DropDownContent} from "../../../Frame/ReactComponents/DropDown";
import Spinner from "../../../Frame/ReactComponents/Spinner";

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
	let selectedNodePath = GetSelectedNodePath(mapID);
	let focusNodeBox = selectedNodePath ? GetNodeBoxForPath(selectedNodePath) : GetNodeBoxClosestToViewCenter();
	if (focusNodeBox == null) return; // can happen if node was just deleted

	let focusNodeBoxComp = FindReact(focusNodeBox[0]) as NodeUI_Inner;
	let focusNodePath = focusNodeBoxComp.props.path;
	let viewOffset = GetViewOffsetForNodeBox(focusNodeBox);

	let oldNodeView = GetNodeView(mapID, focusNodePath);
	if (oldNodeView == null || !oldNodeView.focus || !viewOffset.Equals(oldNodeView.viewOffset))
		store.dispatch(new ACTViewCenterChange({mapID, focusNodePath, viewOffset}));
}

type Props = {map: Map, rootNode?: MapNode, padding?: {left: number, right: number, top: number, bottom: number}, withinPage?: boolean} & React.HTMLProps<HTMLDivElement>
	& Partial<{rootNode: MapNodeEnhanced, focusNode: string, viewOffset: {x: number, y: number}}>;
@Connect((state: RootState, {map, rootNode}: Props)=> {
	let url = URL.Current();
	if (rootNode == null && map && map.rootNode) {
		rootNode = GetNodeEnhanced(GetNode(map.rootNode), map.rootNode+"");
	}

	let lastPathNode = url.pathNodes.LastOrX();
	let crawlerURLMatch = lastPathNode && lastPathNode.match(/\.([0-9]+)$/);
	if (isBot && crawlerURLMatch) {
		let nodeID = parseInt(crawlerURLMatch[1]);
		rootNode = GetNodeEnhanced(GetNode(nodeID), nodeID+"");
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
	static defaultProps = {padding: {left: screen.availWidth, right: screen.availWidth, top: screen.availHeight, bottom: screen.availHeight}};

	downPos: Vector2i;
	render() {
		let {map, rootNode, padding, withinPage, ...rest} = this.props;
		if (map == null)
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 25}}>Loading map...</div>;
		Assert(map._id, "map._id is null!");
		if (rootNode == null)
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 25}}>Loading root node...</div>;

		if (isBot)
			return <NodeUI_ForBots map={map} node={rootNode}/>;

		return (
			<div style={{height: "100%"}}>
				{!withinPage &&
					<ActionBar_Left/>}
				{!withinPage &&
					<ActionBar_Right/>}
				<ScrollView {...rest.Excluding("dispatch")} ref="scrollView"
						backgroundDrag={true} backgroundDragMatchFunc={a=>a == FindDOM(this.refs.scrollView.refs.content) || a == this.refs.mapUI}
						style={E(withinPage && {overflow: "visible"})}
						scrollHBarStyle={E(withinPage && {zIndex: 0})} scrollVBarStyle={E({width: 10}, withinPage && {display: "none"})}
						contentStyle={E({willChange: "transform"}, withinPage && {marginBottom: -300, paddingBottom: 300})}
						//contentStyle={E({willChange: "transform"}, withinPage && {marginTop: -300, paddingBottom: 300, transform: "translateY(300px)"})}
						//bufferScrollEventsBy={10000}
						onScrollEnd={pos=> {
							//if (withinPage) return;
							UpdateFocusNodeAndViewOffset(map._id);
						}}>
					<style>{`
					.MapUI { display: inline-flex; writing-mode: vertical-lr; flex-wrap: wrap; }
					.MapUI > * { writing-mode: horizontal-tb; }
					.MapUI.scrolling > * { pointer-events: none; }
					`}</style>
					<div className="MapUI" ref="mapUI"
							style={{
								position: "relative", /*display: "flex",*/ padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`, whiteSpace: "nowrap",
								filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))",
							}}
							onMouseDown={e=>{
								this.downPos = new Vector2i(e.clientX, e.clientY);
								if (e.button == 1)
									FindDOM_(this.refs.mapUI).addClass("scrolling");
							}}
							onMouseUp={e=> {
								FindDOM_(this.refs.mapUI).removeClass("scrolling");
							}}
							onClick={e=> {
								if (e.target != this.refs.mapUI) return;
								if (new Vector2i(e.clientX, e.clientY).DistanceTo(this.downPos) >= 3) return;
								let mapView = GetMapView(GetOpenMapID());
								if (GetSelectedNodePath(map._id)) {
									store.dispatch(new ACTMapNodeSelect({mapID: map._id, path: null}));
									UpdateFocusNodeAndViewOffset(map._id);
								}
							}}
							onContextMenu={e=> {
								if (e.nativeEvent["passThrough"]) return true;
								e.preventDefault();
							}}>
						<NodeUI map={map} node={rootNode} path={rootNode._id.toString()}/>
						{/*<ReactResizeDetector handleWidth handleHeight onResize={()=> {*/}
						{/*<ResizeSensor ref="resizeSensor" onResize={()=> {
							this.LoadScroll();
						}}/>*/}
					</div>
				</ScrollView>
			</div>
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
		/*if (this.refs.scrollView)
			(this.refs.scrollView as ScrollView).ScrollBy({x: MapUI.padding.leftAndRight, y: MapUI.padding.topAndBottom});*/
	}
	OnLoadComplete() {
		console.log(`NodeUI render count: ${NodeUI.renderCount} (${NodeUI.renderCount / $(".NodeUI").length} per visible node)`);
		this.LoadScroll();
		UpdateURL();
	}

	PostRender() {
		let {withinPage} = this.props;
		if (withinPage && this.refs.scrollView)
			(this.refs.scrollView as ScrollView).vScrollableDOM =  $("#HomeScrollView").children(".content")[0];
	}

	// load scroll from store
	LoadScroll() {
		let {map, rootNode, withinPage} = this.props;
		if (this.refs.scrollView == null) return;

		// if user is already scrolling manually, return so we don't interrupt that process
		if ((this.refs.scrollView as ScrollView).state.scrollOp_bar) return;

		let focusNode_target = GetFocusNode(GetMapView(map._id)); // || map.rootNode.toString();
		let viewOffset_target = GetViewOffset(GetMapView(map._id)); // || new Vector2i(200, 0);
		//Log(`Resizing:${focusNode_target};${viewOffset_target}`);
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
		if (withinPage) // if within a page, don't apply stored vertical-scroll
			viewOffset_changeNeeded.y = 0;
		(this.refs.scrollView as ScrollView).ScrollBy(viewOffset_changeNeeded);
		//Log("Loading scroll: " + Vector2i.prototype.toString.call(viewOffset_target));

		/*if (nextPathTry == focusNode_target)
			this.hasLoadedScroll = true;*/
	}
}

class ActionBar_Left extends BaseComponent<{}, {}> {
	render() {
		let tabBarWidth = 104;
		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: 0, width: `calc(50% - ${tabBarWidth / 2}px)`, top: 0, textAlign: "center",
				//background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={{
					justifyContent: "flex-start", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
					width: "100%", height: 30, borderRadius: "0 0 10px 0",
				}}>
				</Row>
			</nav>
		);
	}
}

@Connect((state, props)=> ({
	initialChildLimit: State(a=>a.main.initialChildLimit),
}))
class ActionBar_Right extends BaseComponent<{} & Partial<{initialChildLimit: number}>, {}> {
	render() {
		let {initialChildLimit} = this.props;
		let tabBarWidth = 104;
		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: `calc(50% + ${tabBarWidth / 2}px)`, right: 0, top: 0, textAlign: "center",
				//background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={{
					justifyContent: "flex-end", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
					width: "100%", height: 30, borderRadius: "0 0 0 10px",
				}}>
					<DropDown>
						<DropDownTrigger>
							<Button text="Layout" onClick={()=> {
							}}/>
						</DropDownTrigger>
						<DropDownContent style={{right: 0}}>
							<Column>
								<Row>
									<Pre>Initial child limit: </Pre>
									<Spinner min={1} value={initialChildLimit} onChange={val=>store.dispatch(new ACTSetInitialChildLimit({value: val}))}/>
								</Row>
							</Column>
						</DropDownContent>
					</DropDown>
				</Row>
			</nav>
		);
	}
}