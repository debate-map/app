import {BaseComponent, Div, Span, Instant} from "../../../Frame/UI/ReactGlobals";
import {MapNode, MapNodeType, MapNodeType_Info} from "./MapNode";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {connect} from "react-redux";
import {DBPath} from "../../../Frame/Database/DatabaseHelpers";
import {Debugger, QuickIncrement} from "../../../Frame/General/Globals_Free";
import Button from "../../../Frame/ReactComponents/Button";
import {PropTypes, Component} from "react";
import Action from "../../../Frame/General/Action";
import {
    GetNodes,
    GetNodes_FBPaths,
    GetNodeView,
    GetSelectedNodeID,
    GetUserID,
    RootState
} from "../../../store/reducers";
import {Map} from "./Map";
import {Log} from "../../../Frame/General/Logging";
import {WaitXThenRun} from "../../../Frame/General/Timers";
import V from "../../../Frame/V/V";
import {MapNodePath, MapNodeView} from "../../../store/Store/Main/MapViews";
import * as VMenuTest1 from "react-vmenu";
import VMenu, {VMenuItem} from "react-vmenu";
import Select from "../../../Frame/ReactComponents/Select";
import {GetEntries} from "../../../Frame/General/Enums";
import {ShowMessageBox} from "../../../Frame/UI/VMessageBox";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import {DN} from "../../../Frame/General/Globals";
import {DataSnapshot} from "firebase";
import {styles} from "../../../Frame/UI/GlobalStyles";

export class ACTSelectMapNode extends Action<{mapID: number, path: MapNodePath}> {}
export class ACTToggleMapNodeExpanded extends Action<{mapID: number, path: MapNodePath}> {}

interface Props {map: Map, nodeID: number, node: MapNode, path?: MapNodePath,
	nodeView?: MapNodeView, nodeChildren?: MapNode[]};
@firebaseConnect(({node}: {node: MapNode})=>[
	...GetNodes_FBPaths({nodeIDs: (node.children || {}).VKeys().Select(a=>a.KeyToInt)})
])
@(connect((state: RootState, {nodeID, node, path, map}: Props)=> {
	var path = path || new MapNodePath([nodeID]);
	return {
		path,
		nodeView: GetNodeView(state, {map, path}),
		nodeChildren: GetNodes(state, {nodeIDs: (node.children || {}).VKeys().Select(a=>a.KeyToInt)})
	};
}) as any)
export default class MapNodeUI extends BaseComponent<Props, {}> {
	//static contextTypes = {map: PropTypes.object};
	render() {
		let {map, nodeID, node, path, nodeView, nodeChildren, children} = this.props;
		/*let {map} = this.context;
		if (map == null) return <div>Loading map, deep...</div>; // not sure why this occurs*/
		return (
			<div className="clickThrough" style={{display: "flex", padding: "5px 0"}}>
				<div className="clickThrough" style={{
					zIndex: 1, transform: "translateX(0)", // fixes z-index issue
				}}>
					<MapNodeUI_Inner map={map} node={node} nodeView={nodeView} path={path}/>
				</div>
				<div className="clickThrough"
						style={{
							zIndex: 1, marginLeft: 10,
							display: "flex", flexDirection: "column", //transform: "translateY(calc(-50% + 14px))",
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
	//[MapNodeType.Package]: "0,100,180",
	[MapNodeType.Package]: "40,60,80",
	//[MapNodeType.Thesis]: "0,100,180",
	//[MapNodeType.Thesis]: "100,50,100",
	//[MapNodeType.Thesis]: "30,100,30",
	[MapNodeType.Thesis]: "0,80,150",
	[MapNodeType.SupportingArgument]: "30,100,30",
	[MapNodeType.OpposingArgument]: "100,30,30",
}
let nodeTypeBackgroundColors_enemy = {
	[MapNodeType.SupportingArgument]: "100,30,30",
	[MapNodeType.OpposingArgument]: "30,100,30",
}
let nodeTypeFontSizes = {
	Category: 16
}

type MapNodeUI_Inner_Props = {map: Map, node: MapNode, nodeView: MapNodeView, path: MapNodePath} & Partial<{selectedNodeID: number, userID: string}>;
@firebaseConnect()
@(connect((state: RootState, props: MapNodeUI_Inner_Props)=> ({
	selectedNodeID: GetSelectedNodeID(state, props),
	userID: GetUserID(state),
})) as any)
class MapNodeUI_Inner extends BaseComponent<MapNodeUI_Inner_Props, {}> {
	//static contextTypes = {store: PropTypes.object.isRequired};
	render() {
		let {firebase, map, node, nodeView, path, selectedNodeID, userID} = this.props;
		//let {dispatch} = this.context.store;
		let backgroundColor = nodeTypeBackgroundColors[node.type];
		//let enemyBackgroundColor = nodeTypeBackgroundColors_enemy[node.type] || "150,150,150";
		let enemyBackgroundColor = "0,0,0";
		let fontSize = nodeTypeFontSizes[node.type] || 14;
		let minWidth = node.type == MapNodeType.Thesis ? 300 : 100;
		let maxWidth = node.type == MapNodeType.Thesis ? 1000 : 200;
		let barSize = 5;
		return (
			<div style={{
				display: "flex", position: "relative", borderRadius: 5, cursor: "pointer", zIndex: 1,
				top: "50%", transform: "translateY(-50%)",
				//boxShadow: "0 0 1px rgba(255,255,255,.5)",
				/*boxShadow: "rgba(0, 0, 0, 1) 0px 0px 100px",
				filter: "drop-shadow(rgba(0,0,0,1) 0px 0px 3px) drop-shadow(rgba(0,0,0,.35) 0px 0px 3px)",*/
				//boxShadow: "rgba(0, 0, 0, 1) 0px 0px 1px",
				boxShadow: `rgba(0,0,0,1) 0px 0px 2px`, willChange: "transform",
			}}>
				{nodeView && nodeView.selected && <MapNodeUI_LeftBox map={map} node={node} nodeView={nodeView} path={path} backgroundColor={backgroundColor}/>}
				<div style={{position: "absolute", transform: "translateX(-100%)", width: 1, height: 28}}/> {/* fixes click-gap */}

				{/* probability-and-such bars */}
				{/*path.nodeIDs.length >= 3 && [
					<div style={{position: "absolute", bottom: -barSize - 1, width: minWidth, height: barSize, background: `rgba(${enemyBackgroundColor},1)`}}/>,
					<div style={{position: "absolute", bottom: -barSize - 1, width: .9 * minWidth, height: barSize, background: `rgba(${backgroundColor},1)`}}/>,
				]*/}

				<div
						style={{
							position: "relative", minWidth: minWidth - 20, maxWidth: maxWidth - 20, zIndex: 2, //background: `rgba(${backgroundColor},.7)`,
							padding: 5, //node.type == MapNodeType.Category || node.type == MapNodeType.Package ? 5 : "3px 5px",
							borderRadius: "5px 0 0 5px", cursor: "pointer"
						}}
						onClick={()=> {
							if (selectedNodeID != node._key.KeyToInt)
								store.dispatch(new ACTSelectMapNode({mapID: map._key.KeyToInt, path}));
						}}>
					{path.nodeIDs.length >= 3 ? [
						<div style={{position: "absolute", zIndex: 0, left: 0, top: 0, bottom: 0, width: "100%", background: `rgba(${enemyBackgroundColor},.7)`, borderRadius: "5px 0 0 5px"}}/>,
						<div style={{position: "absolute", zIndex: 0, left: 0, top: 0, bottom: 0, width: "90%", background: `rgba(${backgroundColor},.7)`, borderRadius: "5px 0 0 5px"}}/>,
					] : <div style={{position: "absolute", zIndex: 0, left: 0, top: 0, bottom: 0, width: "100%", background: `rgba(${backgroundColor},.7)`, borderRadius: "5px 0 0 5px"}}/>}
					<a style={{position: "relative", zIndex: 1, fontSize}}>{node.title}</a>
				</div>
				<Button text={nodeView && nodeView.expanded ? "-" : "+"} size={28}
					style={{
						position: "relative", zIndex: 2, borderRadius: "0 5px 5px 0",
						width: 18, fontSize: 18, textAlign: "center", lineHeight: "28px",
						backgroundColor: `rgba(${backgroundColor},.5)`,
						//backgroundColor: `rgba(40,60,80,.5)`,
						boxShadow: "none",
						":hover": {backgroundColor: `rgba(${backgroundColor.split(",").Select(a=>parseInt(a) - 20).join(",")},.7)`},
					}}
					onClick={()=> {
						store.dispatch(new ACTToggleMapNodeExpanded({mapID: map._key.KeyToInt, path}));
					}}/>
				<VMenu contextMenu={true} onBody={true}>
					{MapNodeType_Info.for[node.type].childTypes.map(childType=> {
						let childTypeInfo = MapNodeType_Info.for[childType];
						return (
							<VMenuItem key={childType} text={`Add ${childTypeInfo.displayName}`} style={styles.vMenuItem} onClick={e=> {
								if (e.button != 0) return;
								let title = "";
								let boxController = ShowMessageBox({
									title: `Add ${childTypeInfo.displayName}`, cancelButton: true,
									messageUI: ()=>(
										<div style={{padding: "10px 0"}}>
											Title: <TextInput value={title} onChange={val=>DN(title = val, boxController.UpdateUI())}/>
										</div>
									),
									onOK: ()=> {
										/*firebase.Ref(`/nodes`).update({
											[node._key]: {
												children: {[newID.IntToKey]: {}},
											},
											[newID.IntToKey]: new MapNode({
												type: childType, title,
												creator: userID, approved: true,
											}),
										});*/
										firebase.Ref("nodes").transaction(nodes=> {
											if (!nodes) return nodes;

											let newID = (nodes as Object).Props.Select(a=>a.name.KeyToInt).Max() + 1;
											nodes[node._key].children = {
												...nodes[node._key].children,
												[newID.IntToKey]: {_: true}
											};
											nodes[newID.IntToKey] = new MapNode({
												type: childType, title,
												creator: userID, approved: true,
											});
											return nodes;
										}, undefined, false);
									}
								});
							}}/>
						);
					})}
					<VMenuItem text="Delete" style={styles.vMenuItem} onClick={e=> {
						if (e.button != 0) return;
						firebase.Ref("nodes").once("value", (snapshot: DataSnapshot)=> {
							let nodes = (snapshot.val() as Object).Props.Select(a=>a.value.Extended({_key: a.name}));
							let parentNodes = nodes.Where(a=>a.children && a.children[node._key]);
							let s_ifParents = parentNodes.length > 1 ? "s" : "";
							ShowMessageBox({
								title: `Delete "${node.title}"`, cancelButton: true,
								message: `Delete the node "${node.title}", and its link${s_ifParents} with ${parentNodes.length} parent-node${s_ifParents}?`,
								onOK: ()=> {
									firebase.Ref("nodes").transaction(nodes=> {
										if (!nodes) return nodes;
										for (let parent of parentNodes)
											nodes[parent._key].children[node._key] = null;
										nodes[node._key] = null;
										return nodes;
									}, undefined, false);
								}
							});
						});
					}}/>
				</VMenu>
			</div>
		);
	}
}

export class MapNodeUI_LeftBox extends BaseComponent<{map: Map, node: MapNode, nodeView?: MapNodeView, path: MapNodePath, backgroundColor: string}, {}> {
	render() {
		let {map, node, nodeView, path, backgroundColor} = this.props;
		//if (nodeView && nodeView.selected)
		return (
			<div style={{
				display: "flex", position: "absolute", transform: "translateX(calc(-100% - 2px))", whiteSpace: "nowrap", height: 28,
				zIndex: 3, background: `rgba(${backgroundColor},.9)`, padding: 3, borderRadius: 5,
				//boxShadow: "0 0 1px rgba(255,255,255,.5)",
				//boxShadow: "rgba(0, 0, 0, 1) 0px 0px 100px",
				boxShadow: `rgba(0,0,0,1) 0px 0px 2px`, willChange: "transform",
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
		/*return (
			<div ref="root" //className="clickThroughChain"
					style={{
						display: "flex", position: "absolute", transform: "translateX(calc(-100% - 2px))", whiteSpace: "nowrap", height: 28,
						borderRadius: 5, opacity: 0,
					}}>
				<Div mt={7} mr={5} style={{fontSize: "13px"}}>90% at 70%</Div>
			</div>
		);*/
	}

	/*get ShouldPopOut() {
		let {nodeView, backgroundColor} = this.props;
		return nodeView == null || !nodeView.selected;
	}
	PreRender() {
		this.PopBackIn(true);
	}
	@Instant
	PostRender() {
		if (this.ShouldPopOut) {
			this.PopOut();
		}
	}
	ComponentWillUnmount() {
		this.PopBackIn(false);
		if (this.tempCopy) {
			this.tempCopy.remove();
			this.tempCopy = null;
		}
	}*/

	/*dom: JQuery;
	domParent: JQuery;
	poppedOut = false;
	oldStyle;
	tempCopy: JQuery; // used to fix that text disappears for a moment (when unmounting then remounting)
	PopOut() {
		if (this.poppedOut) return;

		if (this.tempCopy) {
			this.tempCopy.remove();
			this.tempCopy = null;
		}
		this.dom = $(this.refs.root);
		if (this.dom == null) return;
		this.domParent = this.dom.parent();

		let posFrom = (this.dom as any).positionFrom($("#MapUI"));
		this.dom.prependTo("#MapUI");
		this.oldStyle = this.dom.attr("style");
		/*this.dom.style.left = (this.dom as any).positionFrom($("#MapUI")).left;
		this.dom.style.top = (this.dom as any).positionFrom($("#MapUI")).top;*#/
		this.dom.css("left", posFrom.left);
		this.dom.css("top", posFrom.top);
		this.dom.css("transform", "");
		this.dom.css("opacity", "1");
		this.poppedOut = true;
	}
	PopBackIn(makeTempCopy) {
		if (!this.poppedOut) return;

		if (makeTempCopy)
			this.tempCopy = this.dom.clone().prependTo("#MapUI"); // make a copy that stays here for a bit
		this.dom.appendTo(this.domParent);
		this.dom.attr("style", this.oldStyle);
		this.poppedOut = false;
	}*/
}

/*interface JQuery {
	positionFrom(referenceControl): void;
}*/
setTimeout(()=>$.fn.positionFrom = function(referenceControl) {
	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return {left: offset.left - referenceControlOffset.left, top: offset.top - referenceControlOffset.top};
});