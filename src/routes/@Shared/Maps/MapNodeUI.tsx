import {Vector2i} from "react-vmenu/dist/Helpers/General";
import {BaseComponent, Div, Span, Instant, FindDOM, SimpleShouldUpdate, BaseProps} from "../../../Frame/UI/ReactGlobals";
import {MapNode, MapNodeType, MapNodeType_Info} from "./MapNode";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {connect} from "react-redux";
import {DBPath} from "../../../Frame/Database/DatabaseHelpers";
import {Debugger, QuickIncrement} from "../../../Frame/General/Globals_Free";
import Button from "../../../Frame/ReactComponents/Button";
import {PropTypes, Component} from "react";
import Action from "../../../Frame/General/Action";
import {GetNodes_FBPaths, GetSelectedNodeID, GetUserID, MakeGetNodeView, RootState, MakeGetNodeChildren, MakeGetNodeChildIDs} from "../../../store/reducers";
import {Map} from "./Map";
import {Log} from "../../../Frame/General/Logging";
import {WaitXThenRun} from "../../../Frame/General/Timers";
import V from "../../../Frame/V/V";
import {MapNodeView} from "../../../store/Store/Main/MapViews";
import * as VMenuTest1 from "react-vmenu";
import VMenu, {VMenuItem} from "react-vmenu";
import Select from "../../../Frame/ReactComponents/Select";
import {GetEntries} from "../../../Frame/General/Enums";
import {ShowMessageBox} from "../../../Frame/UI/VMessageBox";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import {DN, ToJSON} from "../../../Frame/General/Globals";
import {DataSnapshot} from "firebase";
import {styles} from "../../../Frame/UI/GlobalStyles";
import {createSelector} from "reselect";

export class ACTSelectMapNode extends Action<{mapID: number, path: string}> {}
export class ACTToggleMapNodeExpanded extends Action<{mapID: number, path: string}> {}

interface Props {map: Map, node: MapNode, path?: string,
	nodeView?: MapNodeView, nodeChildren?: MapNode[]};
@firebaseConnect(({node}: {node: MapNode})=>[
	...GetNodes_FBPaths({nodeIDs: MakeGetNodeChildIDs()({}, {node})})
])
@(connect(()=> {
	var getNodeView = MakeGetNodeView();
	var getNodeChildren = MakeGetNodeChildren();
	return ((state: RootState, {node, path, map}: Props & BaseProps)=> {
		var path = path || node._key.KeyToInt.toString();
		var firebase = store.getState().firebase;
		//Log("Checking:" + node._key.KeyToInt);
		return {
			path,
			nodeView: getNodeView(state, {firebase, map, path}),
			nodeChildren: getNodeChildren(state, {firebase, node}),
		};
	}) as any;
}) as any)
export default class MapNodeUI extends BaseComponent<Props, {childrenHeight: number, upChildrenHeight: number}> {
	//static contextTypes = {map: PropTypes.object};

	/*shouldComponentUpdate(oldProps: Props, newProps: Props) {
		if (ToJSON(oldProps.Excluding("nodeView")) != ToJSON(newProps.Excluding("nodeView")))
			return true;
		if (oldProps.nodeView.expanded != newProps.nodeView.expanded || oldProps.nodeView.selected != newProps.nodeView.selected)
			return true;
		return false;
	}*/

	render() {
		let {map, node, path, nodeView, nodeChildren, children} = this.props;
		let {childrenHeight, upChildrenHeight} = this.state;
		/*let {map} = this.context;
		if (map == null) return <div>Loading map, deep...</div>; // not sure why this occurs*/
		//Log("Updating MapNodeUI:" + nodeID);

		let separateChildren = node.type == MapNodeType.Thesis;
		let upChildren = node.type == MapNodeType.Thesis ? nodeChildren.Where(a=>a.type == MapNodeType.SupportingArgument) : [];
		let downChildren = node.type == MapNodeType.Thesis ? nodeChildren.Where(a=>a.type == MapNodeType.OpposingArgument) : [];

		let fontSize = nodeTypeFontSizes[node.type] || 14;
		let textPreview = $(`<a style="fontSize: ${fontSize}; whiteSpace: initial;">${node.title}</a>`);
		let expectedTextWidth = V.GetContentWidth(textPreview);
		let expectedOtherStuffWidth = 26;
		let expectedBoxWidth = expectedTextWidth + expectedOtherStuffWidth;

		let minWidth = node.type == MapNodeType.Thesis ? 350 : 100;
		let maxWidth = node.type == MapNodeType.Thesis ? 500 : 200;
		let width = expectedBoxWidth.KeepBetween(minWidth, maxWidth);

		let maxTextWidth = maxWidth - expectedOtherStuffWidth;
		let expectedLines = (expectedTextWidth / maxTextWidth).CeilingTo(1);
		let expectedHeight = (expectedLines * 17) + 10; // (lines * line-height) + top-plus-bottom-padding

		//Log("Rendering:" + node._key.KeyToInt);

		return (
			<div className="clickThrough" style={{position: "relative", display: "flex", padding: "5px 0"}}>
				<div className="clickThrough" style={{
					zIndex: 1, //transform: "translateX(0)", // fixes z-index issue
					paddingTop: separateChildren ? (upChildrenHeight|0) - (expectedHeight / 2) : ((childrenHeight|0) / 2) - (expectedHeight / 2),
				}}>
					<MapNodeUI_Inner map={map} node={node} nodeView={nodeView} path={path} width={width}/>
				</div>
				{node.type != MapNodeType.Thesis &&
					<div className="clickThrough" style={{
						display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 10, zIndex: 2,
					}} ref={c=>c && c.clientHeight != this.state.childrenHeight && this.setState({childrenHeight: c.clientHeight})}>
						{nodeChildren.map((child, index)=> {
							return <MapNodeUI key={index} map={map} node={child} path={path + "/" + child._key.KeyToInt}/>;
						})}
					</div>}
				{node.type == MapNodeType.Thesis &&
					<div className="clickThrough" style={{display: "flex", flexDirection: "column", zIndex: 2}}>
						<div className="clickThrough" style={{
							display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 10, zIndex: 4,
						}} ref={c=>c && c.clientHeight != this.state.upChildrenHeight && this.setState({upChildrenHeight: c.clientHeight})}>
							{upChildren.map((child, index)=> {
								return <MapNodeUI key={"up_" + index} map={map} node={child} path={path + "/" + child._key.KeyToInt}/>;
							})}
						</div>
						<div className="clickThrough" style={{
							display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 10, zIndex: 3,
						}}>
							{downChildren.map((child, index)=> {
								return <MapNodeUI key={"down_" + index} map={map} node={child} path={path + "/" + child._key.KeyToInt}/>;
							})}
						</div>
					</div>}
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

type MapNodeUI_Inner_Props = {map: Map, node: MapNode, nodeView: MapNodeView, path: string, width: number} & Partial<{selectedNodeID: number, userID: string}>;
@firebaseConnect()
@(connect((state: RootState, props: MapNodeUI_Inner_Props)=> ({
	selectedNodeID: GetSelectedNodeID(state, props),
	userID: GetUserID(state),
})) as any)
class MapNodeUI_Inner extends BaseComponent<MapNodeUI_Inner_Props, {}> {
	//static contextTypes = {store: PropTypes.object.isRequired};
	render() {
		let {firebase, map, node, nodeView, path, width, selectedNodeID, userID} = this.props;
		//let {dispatch} = this.context.store;
		let backgroundColor = nodeTypeBackgroundColors[node.type];
		//let enemyBackgroundColor = nodeTypeBackgroundColors_enemy[node.type] || "150,150,150";
		let fontSize = nodeTypeFontSizes[node.type] || 14;
		/*let minWidth = node.type == MapNodeType.Thesis ? 350 : 100;
		let maxWidth = node.type == MapNodeType.Thesis ? 500 : 200;*/
		let barSize = 5;
		let pathNodeIDs = path.split("/").Select(a=>parseInt(a));
		let fillPercent = pathNodeIDs.length <= 2 ? 1 : .9;
		return (
			<div style={{
				display: "flex", position: "relative", borderRadius: 5, cursor: "pointer", zIndex: 1,
				//top: "50%", transform: "translateY(calc(-50% - .5px))", // -.5px is added so we end with integer (which avoids anti-aliasing)
				//boxShadow: "0 0 1px rgba(255,255,255,.5)",
				/*boxShadow: "rgba(0, 0, 0, 1) 0px 0px 100px",
				filter: "drop-shadow(rgba(0,0,0,1) 0px 0px 3px) drop-shadow(rgba(0,0,0,.35) 0px 0px 3px)",*/
				//boxShadow: "rgba(0, 0, 0, 1) 0px 0px 1px",
				boxShadow: `rgba(0,0,0,1) 0px 0px 2px`, width,
			}}>
				{nodeView && nodeView.selected && <MapNodeUI_LeftBox map={map} node={node} nodeView={nodeView} backgroundColor={backgroundColor}/>}
				<div style={{position: "absolute", transform: "translateX(-100%)", width: 1, height: 28}}/> {/* fixes click-gap */}

				{/* probability-and-such bars */}
				{/*path.nodeIDs.length >= 3 && [
					<div style={{position: "absolute", bottom: -barSize - 1, width: minWidth, height: barSize, background: `rgba(${enemyBackgroundColor},1)`}}/>,
					<div style={{position: "absolute", bottom: -barSize - 1, width: .9 * minWidth, height: barSize, background: `rgba(${backgroundColor},1)`}}/>,
				]*/}

				<div style={{
					display: "flex", zIndex: 2, width: "100%", //background: `rgba(${backgroundColor},.7)`,
					background: "rgba(0,0,0,.7)", borderRadius: 5, cursor: "pointer",
				}}>
					<div style={{
						position: "relative", width: "100%", //minWidth: minWidth - 20, maxWidth: maxWidth - 20,
						padding: 5, //node.type == MapNodeType.Category || node.type == MapNodeType.Package ? 5 : "3px 5px",
					}} onClick={()=> {
						if (selectedNodeID != node._key.KeyToInt)
							store.dispatch(new ACTSelectMapNode({mapID: map._key.KeyToInt, path}));
					}}>
						<div style={{
							position: "absolute", zIndex: 0, left: 0, top: 0, bottom: 0,
							width: (fillPercent * 100).RoundTo(1) + "%", background: `rgba(${backgroundColor},.7)`, borderRadius: "5px 0 0 5px"
						}}/>
						<a style={{position: "relative", zIndex: 1, fontSize, whiteSpace: "initial"}}>
							{node.title}
						</a>
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
					<Button //text={nodeView && nodeView.expanded ? "-" : "+"} size={28}
							style={{
								display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2, borderRadius: "0 5px 5px 0",
								width: 18, padding: 0,
								//fontSize: 18,
								fontSize: nodeView && nodeView.expanded ? 23 : 17,
								//lineHeight: "28px",
								//backgroundColor: `rgba(${backgroundColor},.5)`,
								backgroundColor: `rgba(${backgroundColor.split(",").Select(a=>(parseInt(a) * .8).RoundTo(1)).join(",")},.7)`,
								boxShadow: "none",
								":hover": {backgroundColor: `rgba(${backgroundColor.split(",").Select(a=>(parseInt(a) * .9).RoundTo(1)).join(",")},.7)`},
							}}
							onClick={()=> {
								store.dispatch(new ACTToggleMapNodeExpanded({mapID: map._key.KeyToInt, path}));
							}}>
						{nodeView && nodeView.expanded ? "-" : "+"}
					</Button>
				</div>
			</div>
		);
	}
}

export class MapNodeUI_LeftBox extends BaseComponent<{map: Map, node: MapNode, nodeView?: MapNodeView, backgroundColor: string}, {}> {
	render() {
		let {map, node, nodeView, backgroundColor} = this.props;
		return (
			<div style={{
				display: "flex", flexDirection: "column", position: "absolute", transform: "translateX(calc(-100% - 2px))", whiteSpace: "nowrap",
				zIndex: 5, padding: 3,
				//background: `rgba(${backgroundColor},.9)`,
				background: `rgba(0,0,0,.7)`,
				borderRadius: 5,
				//boxShadow: "0 0 1px rgba(255,255,255,.5)",
				//boxShadow: "rgba(0, 0, 0, 1) 0px 0px 100px",
				boxShadow: `rgba(0,0,0,1) 0px 0px 2px`,
			}}>
				<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${backgroundColor},.7)`}}/>
				<Button text="Probability" style={{position: "relative", display: "flex", justifyContent: "space-between", padding: "3px 7px"}}>
					<Span ml={5} style={{float: "right"}}>90%</Span>
				</Button>
				<Button text="Degree" enabled={false} mt={5} style={{position: "relative", display: "flex", justifyContent: "space-between", padding: "3px 7px"}}>
					<Span ml={5}style={{float: "right"}}>70%</Span>
				</Button>
				<Button text="..."
					style={{
						margin: "5px -3px -3px -3px", height: 15, lineHeight: "8px", padding: "0 7px",
						position: "relative", display: "flex", justifyContent: "space-around", //alignItems: "center",
						background: null, boxShadow: null, borderTop: "1px solid rgba(0,0,0,1)",
						borderRadius: "0 0 5px 5px",
						":hover": {background: `rgba(${backgroundColor},.5)`},
					}}/>
			</div>
		);
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