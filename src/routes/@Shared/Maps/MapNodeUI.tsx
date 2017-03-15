import {BaseComponent, Div, Span, Instant} from "../../../Frame/UI/ReactGlobals";
import {MapNode, MapNodeType} from "./MapNode";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {connect} from "react-redux";
import {DBPath} from "../../../Frame/Database/DatabaseHelpers";
import {Debugger, QuickIncrement} from "../../../Frame/General/Globals_Free";
import Button from "../../../Frame/ReactComponents/Button";
import {PropTypes, Component} from "react";
import Action from "../../../Frame/General/Action";
import {GetNodeView, RootState, GetSelectedNodeID} from "../../../store/reducers";
import {Map} from "./Map";
import {Log} from "../../../Frame/General/Logging";
import {WaitXThenRun} from "../../../Frame/General/Timers";
import V from "../../../Frame/V/V";
import {MapNodePath, MapNodeView} from "../../../store/Store/Main/MapViews";

export class ACTSelectMapNode extends Action<{mapID: number, path: MapNodePath}> {}
export class ACTToggleMapNodeExpanded extends Action<{mapID: number, path: MapNodePath}> {}

interface Props {map: Map, nodeID: number, node: MapNode, path?: MapNodePath,
	nodeView?: MapNodeView, nodeChildren?: MapNode[]};
@firebaseConnect(({node}: {node: MapNode})=>[
	...(node.children || {}).VKeys().Select(a=>DBPath(`nodes/${a}`))
])
@(connect((state: RootState, {nodeID, node, path, map}: Props)=> {
	var path = path || new MapNodePath([nodeID]);
	return {
		path,
		nodeView: GetNodeView(state, {map, path}),
		nodeChildren: (node.children || {}).VKeys().Select(a=>helpers.dataToJS(state.firebase, DBPath(`nodes/${a}`))).Where(a=>a)
	};
}) as any)
export default class MapNodeUI extends BaseComponent<Props, {}> {
	//static contextTypes = {map: PropTypes.object};
	render() {
		let {map, nodeID, node, path, nodeView, nodeChildren, children} = this.props;
		/*let {map} = this.context;
		if (map == null) return <div>Loading map, deep...</div>; // not sure why this occurs*/
		return (
			<div className="clickThrough" style={{padding: "3px 0"}}>
				<div className="clickThrough" style={{
					zIndex: 1, float: "left", transform: "translateX(0)" // fixes z-index issue
				}}>
					<MapNodeUI_Inner map={map} node={node} nodeView={nodeView} path={path}/>
				</div>
				<div className="clickThrough"
						style={{
							zIndex: 1, marginLeft: 10, float: "left",
							transform: "translateY(calc(-50% + 14px))", display: "flex", flexDirection: "column"
						}}>
					{nodeView && nodeView.expanded && nodeChildren.map((child, index)=> {
						let childID = node.children.VKeys()[index].KeyToInt;
						return <MapNodeUI key={index} map={map} nodeID={childID} node={child} path={path.Extend(childID)}/>;
					})}
				</div>
			</div>
		);
	}
}

let nodeTypeBackgroundColors = {
	[MapNodeType.Category]: "40,60,80",
	[MapNodeType.Package]: "0,100,180",
	[MapNodeType.Thesis]: "0,100,180",
	[MapNodeType.PositiveArgument]: "0,100,180",
	[MapNodeType.NegativeArgument]: "0,100,180",
}
let nodeTypeFontSizes = {
	[MapNodeType.Category]: 16
}

type MapNodeUI_Inner_Props = {map: Map, node: MapNode, nodeView: MapNodeView, path: MapNodePath} & {selectedNodeID?: number};
@(connect((state: RootState, props: MapNodeUI_Inner_Props)=> ({
	selectedNodeID: GetSelectedNodeID(state, props),
})) as any)
class MapNodeUI_Inner extends BaseComponent<MapNodeUI_Inner_Props, {}> {
	//static contextTypes = {store: PropTypes.object.isRequired};
	render() {
		let {map, node, nodeView, path, selectedNodeID} = this.props;
		//let {dispatch} = this.context.store;
		let backgroundColor = nodeTypeBackgroundColors[node.type];
		let fontSize = nodeTypeFontSizes[node.type] || 14;
		return (
			<div style={{
				display: "flex", position: "relative", borderRadius: 5, cursor: "pointer", zIndex: 1,
				boxShadow: "0 0 1px rgba(255,255,255,.5)",
				filter: "drop-shadow(rgba(0,0,0,1) 0px 0px 3px) drop-shadow(rgba(0,0,0,.35) 0px 0px 3px)",
			}}>
				<MapNodeUI_LeftBox map={map} node={node} nodeView={nodeView} path={path} backgroundColor={backgroundColor}/>
				<div style={{position: "absolute", transform: "translateX(-100%)", width: 1, height: 28}}/> {/* fixes click-gap */}
				<div style={{position: "relative", zIndex: 2, background: `rgba(${backgroundColor},.7)`, padding: 5, borderRadius: "5px 0 0 5px", cursor: "pointer"}}
						onClick={()=> {
							if (selectedNodeID != node._key.KeyToInt)
								store.dispatch(new ACTSelectMapNode({mapID: map._key.KeyToInt, path}));
						}}>
					<a style={{fontSize}}>{node.title}</a>
				</div>
				<Button text={nodeView && nodeView.expanded ? "-" : "+"} size={28}
					style={{
						position: "relative", zIndex: 2, borderRadius: "0 5px 5px 0",
						width: 18, fontSize: 18, textAlign: "center", lineHeight: "28px",
						backgroundColor: `rgba(${backgroundColor},.5)`, boxShadow: "none",
						":hover": {backgroundColor: `rgba(${backgroundColor.split(",").Select(a=>parseInt(a) - 20).join(",")},.7)`},
					}}
					onClick={()=> {
						store.dispatch(new ACTToggleMapNodeExpanded({mapID: map._key.KeyToInt, path}));
					}}/>
			</div>
		);
	}
}

export class MapNodeUI_LeftBox extends BaseComponent<{map: Map, node: MapNode, nodeView?: MapNodeView, path: MapNodePath, backgroundColor: string}, {}> {
	render() {
		let {map, node, nodeView, path, backgroundColor} = this.props;
		if (nodeView && nodeView.selected)
			return (
				<div style={{
					display: "flex", position: "absolute", transform: "translateX(calc(-100% - 2px))", whiteSpace: "nowrap", height: 28,
					zIndex: 3, background: `rgba(${backgroundColor},.7)`, padding: 3, borderRadius: 5,
					boxShadow: "0 0 1px rgba(255,255,255,.5)",
				}}>
					<Button text="Probability" mr={7} style={{padding: "3px 7px"}}>
						<Span ml={5}>90%</Span>
					</Button>
					<Button text="Degree" enabled={false} mr={7} style={{padding: "3px 7px"}}>
						<Span ml={5}>70%</Span>
					</Button>
					<Button text="..." style={{padding: "3px 7px"}}/>
				</div>
			);
		return (
			<div ref="root" className="clickThroughChain"
					style={{
						display: "flex", position: "absolute", transform: "translateX(calc(-100% - 2px))", whiteSpace: "nowrap", height: 28,
						borderRadius: 5, //opacity: 0,
					}}>
				<Div mt={7} mr={5} style={{fontSize: "13px"}}>90% at 70%</Div>
			</div>
		);
	}

	get ShouldPopOut() {
		let {nodeView, backgroundColor} = this.props;
		return nodeView == null || !nodeView.selected;
	}
	PreRender() {
		this.PopBackIn();
	}
	@Instant
	PostRender() {
		if (this.ShouldPopOut) {
			this.PopOut();
		}
	}
	ComponentWillUnmount() {
		this.PopBackIn();
	}

	dom: HTMLElement;
	domParent: HTMLElement;
	poppedOut = false;
	oldStyle;
	PopOut() {
		if (this.poppedOut) return;
		this.dom = this.refs.root;
		if (this.dom == null) return;
		this.domParent = this.dom.parentElement;

		let posFrom = ($(this.dom) as any).positionFrom($("#MapUI"));
		//document.querySelector("#MapUI").appendChild(this.dom);
		document.querySelector("#MapUI").insertBefore(this.dom, document.querySelector("#MapUI").firstChild);
		this.oldStyle = $(this.dom).attr("style");
		/*this.dom.style.left = ($(this.dom) as any).positionFrom($("#MapUI")).left;
		this.dom.style.top = ($(this.dom) as any).positionFrom($("#MapUI")).top;*/
		$(this.dom).css("left", posFrom.left);
		$(this.dom).css("top", posFrom.top);
		$(this.dom).css("transform", "");
		//$(this.dom).css("opacity", "1");
		this.poppedOut = true;
	}
	PopBackIn() {
		if (!this.poppedOut) return;
		this.domParent.appendChild(this.dom);
		$(this.dom).attr("style", this.oldStyle);
		this.poppedOut = false;
	}
}

/*interface JQuery {
	positionFrom(referenceControl): void;
}*/
setTimeout(()=>$.fn.positionFrom = function(referenceControl) {
	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return {left: offset.left - referenceControlOffset.left, top: offset.top - referenceControlOffset.top};
});