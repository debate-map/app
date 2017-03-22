import {Vector2i} from "react-vmenu/dist/Helpers/General";
import {BaseComponent, Div, Span, Instant, FindDOM, SimpleShouldUpdate, BaseProps, GetInnerComp} from "../../../Frame/UI/ReactGlobals";
import {MapNode, MapNodeType, MapNodeType_Info} from "./MapNode";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {connect} from "react-redux";
import {DBPath} from "../../../Frame/Database/DatabaseHelpers";
import {Debugger, QuickIncrement, E} from "../../../Frame/General/Globals_Free";
import Button from "../../../Frame/ReactComponents/Button";
import {PropTypes, Component} from "react";
import Action from "../../../Frame/General/Action";
import {GetNodes_FBPaths, GetSelectedNodeID, GetUserID, MakeGetNodeView, RootState, MakeGetNodeChildren, MakeGetNodeChildIDs} from "../../../store/reducers";
import {Map} from "./Map";
import {Log} from "../../../Frame/General/Logging";
import {WaitXThenRun} from "../../../Frame/General/Timers";
import V from "../../../Frame/V/V";
import {MapNodeView, ACTMapNodeSelect, ACTMapNodeExpandedToggle, ACTMapNodePanelOpen} from "../../../store/Store/Main/MapViews";
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

type Props = {map: Map, node: MapNode, path?: string, widthOverride?: number} & Partial<{nodeView: MapNodeView, nodeChildren: MapNode[]}>;
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
export default class MapNodeUI extends BaseComponent<Props, {childrenWidthOverride: number, childrenCenterY: number}> {
	//static contextTypes = {map: PropTypes.object};

	/*shouldComponentUpdate(oldProps: Props, newProps: Props) {
		if (ToJSON(oldProps.Excluding("nodeView")) != ToJSON(newProps.Excluding("nodeView")))
			return true;
		if (oldProps.nodeView.expanded != newProps.nodeView.expanded || oldProps.nodeView.selected != newProps.nodeView.selected)
			return true;
		return false;
	}*/

	render() {
		let {map, node, path, widthOverride, nodeView, nodeChildren, children} = this.props;
		let {childrenWidthOverride, childrenCenterY} = this.state;
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

		//let minWidth = node.type == MapNodeType.Thesis ? 350 : 100;
		let minWidth = node.type == MapNodeType.Thesis ? 350 : 100;
		let maxWidth = node.type == MapNodeType.Thesis ? 500 : 200;
		let width = expectedBoxWidth.KeepBetween(minWidth, maxWidth);

		let maxTextWidth = maxWidth - expectedOtherStuffWidth;
		let expectedLines = (expectedTextWidth / maxTextWidth).CeilingTo(1);
		let expectedHeight = (expectedLines * 17) + 10; // (lines * line-height) + top-plus-bottom-padding

		this.childBoxes = [];
		return (
			<div className="clickThrough" style={{position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0}}>
				<div className="clickThrough" ref="innerBoxHolder" style={{
					//transform: "translateX(0)", // fixes z-index issue
					paddingTop: ((childrenCenterY|0) - (expectedHeight / 2)).KeepAtLeast(0),
				}}>
					<MapNodeUI_Inner ref="innerBox" /*ref={c=>(this as any).innerBox = c}*/ map={map} node={node} nodeView={nodeView} path={path} width={width} widthOverride={widthOverride}/>
				</div>
				{!separateChildren &&
					<div ref="childHolder" className="clickThrough" style={{
						display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 10,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: nodeView && nodeView.expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{nodeChildren.map((child, index)=> {
							return <MapNodeUI key={index} ref={c=>this.childBoxes.push(c)} map={map} node={child} path={path + "/" + child._key.KeyToInt} widthOverride={childrenWidthOverride}/>;
						})}
					</div>}
				{separateChildren &&
					<div ref="childHolder" className="clickThrough" style={{
						display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 10,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: nodeView && nodeView.expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						<div ref="upChildHolder" className="clickThrough" style={{display: "flex", flexDirection: "column"}}>
							{upChildren.map((child, index)=> {
								return <MapNodeUI key={"up_" + index} ref={c=>this.childBoxes.push(c)} map={map} node={child} path={path + "/" + child._key.KeyToInt} widthOverride={childrenWidthOverride}/>;
							})}
						</div>
						<div className="clickThrough" style={{display: "flex", flexDirection: "column"}}>
							{downChildren.map((child, index)=> {
								return <MapNodeUI key={"down_" + index} ref={c=>this.childBoxes.push(c)} map={map} node={child} path={path + "/" + child._key.KeyToInt} widthOverride={childrenWidthOverride}/>;
							})}
						</div>
					</div>}
			</div>
		);
	}
	childBoxes: MapNodeUI[];
	renderingFromPostRender = false;
	PostRender() {
		let {childHolder, upChildHolder} = this.refs;
		if (this.renderingFromPostRender) {
			this.renderingFromPostRender = false;
			return;
		}
		/*Log(`Child-box-max-height(${this.props.node._key.KeyToInt}): ${
			this.childBoxes.Any(a=>a != null) ? this.childBoxes.Where(a=>a != null).Select(a=>a.refs.innerBox ? a.refs.innerBox.clientWidth : ((childBoxes as any), Debugger(), 1)).Max() : 0
		}`);*/
		if (this.SetState({
			childrenWidthOverride: this.childBoxes.Any(a=>a != null)
				? this.childBoxes.Where(a=>a != null).Select(a=> {
					var childDOM = FindDOM(GetInnerComp(a).refs.innerBox);
					var oldMinWidth = childDOM.style.minWidth;
					childDOM.style.minWidth = 0 + "px";
					var result = childDOM.clientWidth;
					childDOM.style.minWidth = oldMinWidth;
					return result;
				}).Max()
				: 0,
			childrenCenterY: upChildHolder
				? (upChildHolder.style.display != "none" ? upChildHolder.clientHeight : 0)
				: (childHolder.style.display != "none" ? childHolder.clientHeight / 2 : 0)
		}))
			this.renderingFromPostRender = true;
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

type MapNodeUI_Inner_Props = {map: Map, node: MapNode, nodeView: MapNodeView, path: string, width: number, widthOverride?: number} & Partial<{userID: string}>;
@firebaseConnect()
@(connect(()=> {
	return (state: RootState, props: MapNodeUI_Inner_Props)=> ({
		userID: GetUserID(state),
	}) as any;
}) as any)
class MapNodeUI_Inner extends BaseComponent<MapNodeUI_Inner_Props, {hovered: boolean, openPanel_preview: string}> {
	render() {
		let {firebase, map, node, nodeView, path, width, widthOverride, userID} = this.props;
		let {hovered, openPanel_preview} = this.state;
		let backgroundColor = nodeTypeBackgroundColors[node.type];
		let fontSize = nodeTypeFontSizes[node.type] || 14;
		/*let minWidth = node.type == MapNodeType.Thesis ? 350 : 100;
		let maxWidth = node.type == MapNodeType.Thesis ? 500 : 200;*/
		let barSize = 5;
		let pathNodeIDs = path.split("/").Select(a=>parseInt(a));
		let fillPercent = pathNodeIDs.length <= 2 ? 1 : .9;

		let leftPanelShow = (nodeView && nodeView.selected) || hovered;
		let panelToShow = openPanel_preview || (nodeView && nodeView.openPanel);
		let bottomPanelShow = leftPanelShow && panelToShow;

		return (
			<div style={{
						display: "flex", position: "relative", borderRadius: 5, cursor: "pointer",
						boxShadow: `rgba(0,0,0,1) 0px 0px 2px`, width, minWidth: widthOverride,
					}}
					onMouseEnter={()=>this.setState({hovered: true})} onMouseLeave={()=>this.setState({hovered: false})}
					onClick={e=> {
						if ((e.nativeEvent as any).ignore) return;
						if (nodeView == null || !nodeView.selected)
							store.dispatch(new ACTMapNodeSelect({mapID: map._key.KeyToInt, path}));
					}}>
				{leftPanelShow &&
					<MapNodeUI_LeftBox parent={this} map={map} path={path} node={node} nodeView={nodeView} backgroundColor={backgroundColor} asHover={hovered}/>}
				{/* fixes click-gap */}
				{leftPanelShow &&
					<div style={{
						position: "absolute", //zIndex: hovered ? 6 : 5,
						//transform: "translateX(-100%)", width: 1, height: 28,
						//right: "100%",
						left: -50, width: 100, top: 0, bottom: 0,
					}}/>}

				<div style={{
							display: "flex", width: "100%", //background: `rgba(${backgroundColor},.7)`,
							background: "rgba(0,0,0,.7)", borderRadius: 5, cursor: "pointer",
						}}>
					<div style={{
								position: "relative", width: "100%", //minWidth: minWidth - 20, maxWidth: maxWidth - 20,
								padding: 5, //node.type == MapNodeType.Category || node.type == MapNodeType.Package ? 5 : "3px 5px",
							}}>
						<div style={{
								position: "absolute", left: 0, top: 0, bottom: 0,
								width: (fillPercent * 100).RoundTo(1) + "%", background: `rgba(${backgroundColor},.7)`, borderRadius: "5px 0 0 5px"
							}}/>
						<a style={{position: "relative", fontSize, whiteSpace: "initial"}}>
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
								display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
								width: 18, padding: 0,
								//fontSize: 18,
								fontSize: nodeView && nodeView.expanded ? 23 : 17,
								//lineHeight: "28px",
								//backgroundColor: `rgba(${backgroundColor},.5)`,
								backgroundColor: `rgba(${backgroundColor.split(",").Select(a=>(parseInt(a) * .8).RoundTo(1)).join(",")},.7)`,
								boxShadow: "none",
								":hover": {backgroundColor: `rgba(${backgroundColor.split(",").Select(a=>(parseInt(a) * .9).RoundTo(1)).join(",")},.7)`},
							}}
							onClick={e=> {
								store.dispatch(new ACTMapNodeExpandedToggle({mapID: map._key.KeyToInt, path}));
								//return false;
								e.nativeEvent.ignore = true; // for some reason, "return false" isn't working
							}}>
						{nodeView && nodeView.expanded ? "-" : "+"}
					</Button>
				</div>
				{bottomPanelShow &&
					<div style={{
								position: "absolute", top: "calc(100% + 1px)", width: width, minWidth: (widthOverride|0).KeepAtLeast(350), zIndex: hovered ? 6 : 5,
								padding: 3, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`,
							}}>
						<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${backgroundColor},.7)`}}/>
						{panelToShow == "probability" &&
							<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
								Probability that the statement, as presented, is true.
							</div>}
						{/*panelToShow == "intensity" &&
							<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
								Relative intensity of the strongest version of the statement that's still true.
							</div>*/}
						{panelToShow == "adjustment" &&
							<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
								What intensity the statement should be strengthened/weakened to, to reach its ideal state. (making substantial claims while maintaining accuracy)
							</div>}
					</div>}
			</div>
		);
	}
}

export class MapNodeUI_LeftBox extends BaseComponent<
		{parent: MapNodeUI_Inner, map: Map, path: string, node: MapNode, nodeView?: MapNodeView, backgroundColor: string, asHover: boolean},
		{}> {
	render() {
		let {map, path, node, nodeView, backgroundColor, asHover} = this.props;
		return (
			<div style={{
				display: "flex", flexDirection: "column", position: "absolute", whiteSpace: "nowrap",
				right: "calc(100% + 1px)", zIndex: asHover ? 6 : 5,
			}}>
				<div style={{position: "relative", padding: 3, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`}}>
					<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${backgroundColor},.7)`}}/>
					<PanelButton parent={this} map={map} path={path} panel="probability" text="Probability" style={{marginTop: 0}}>
						<Span ml={5} style={{float: "right"}}>90%<sup style={{whiteSpace: "pre", top: -5, marginRight: -3, marginLeft: 1, fontSize: 10}}>1</sup></Span>
					</PanelButton>
					<PanelButton parent={this} map={map} path={path} panel="adjustment" text="Adjustment">
						<Span ml={5} style={{float: "right"}}>70%<sup style={{whiteSpace: "pre", top: -5, marginRight: -3, marginLeft: 1, fontSize: 10}}>1</sup></Span>
					</PanelButton>
					<Button text="..."
						style={{
							margin: "3px -3px -3px -3px", height: 17, lineHeight: "12px", padding: 0,
							position: "relative", display: "flex", justifyContent: "space-around", //alignItems: "center",
							background: null, boxShadow: null, borderRadius: "0 0 5px 5px",
							":hover": {background: `rgba(${backgroundColor},.5)`},
						}}/>
				</div>
				<div style={{position: "relative", marginTop: 1, padding: 3, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`}}>
					<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${backgroundColor},.7)`}}/>
					<PanelButton parent={this} map={map} path={path} panel="definitions" text="Definitions" style={{marginTop: 0}}/>
					<PanelButton parent={this} map={map} path={path} panel="questions" text="Questions"/>
					<PanelButton parent={this} map={map} path={path} panel="tags" text="Tags"/>
					<PanelButton parent={this} map={map} path={path} panel="discuss" text="Discuss (meta)"/>
					<PanelButton parent={this} map={map} path={path} panel="history" text="History"/>
					<Button text="..."
						style={{
							margin: "3px -3px -3px -3px", height: 17, lineHeight: "12px", padding: 0,
							position: "relative", display: "flex", justifyContent: "space-around", //alignItems: "center",
							background: null, boxShadow: null, borderRadius: "0 0 5px 5px",
							":hover": {background: `rgba(${backgroundColor},.5)`},
						}}/>
				</div>
			</div>
		);
	}
}

class PanelButton extends BaseComponent<{parent: MapNodeUI_LeftBox, map: Map, path: string, panel: string, text: string, style?}, {}> {
	render() {
		let {map, path, panel, text, style, children} = this.props;
		return (
			<Button text={text} style={E({position: "relative", display: "flex", justifyContent: "space-between", marginTop: 5, padding: "3px 7px"}, style)}
					onClick={()=> {
						//parent.props.parent.SetState({openPanel: panel});
						store.dispatch(new ACTMapNodePanelOpen({mapID: map._key.KeyToInt, path, panel}));
					}}
					onMouseEnter={()=> {
						let {parent} = this.props;
						parent.props.parent.SetState({openPanel_preview: panel});
					}}
					onMouseLeave={()=> {
						let {parent} = this.props;
						parent.props.parent.SetState({openPanel_preview: null});
					}}>
				{/*<div style={{position: "absolute", right: -4, width: 4, top: 0, bottom: 0}}/>*/}
				{children}
			</Button>
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