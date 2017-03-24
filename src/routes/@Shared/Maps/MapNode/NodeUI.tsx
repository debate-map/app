import {BaseComponent, Div, Span, Instant, FindDOM, SimpleShouldUpdate, BaseProps, GetInnerComp, ShallowCompare, RenderSource, FindDOM_} from "../../../../Frame/UI/ReactGlobals";
import {MapNode, MapNodeType, MapNodeType_Info} from "../MapNode";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {connect} from "react-redux";
import {DBPath, GetData} from "../../../../Frame/Database/DatabaseHelpers";
import {Debugger, QuickIncrement, E, GetTimeSinceLoad} from "../../../../Frame/General/Globals_Free";
import Button from "../../../../Frame/ReactComponents/Button";
import {PropTypes, Component} from "react";
import Action from "../../../../Frame/General/Action";
import {GetSelectedNodeID, GetUserID, MakeGetNodeView, RootState, MakeGetNodeChildren, MakeGetNodeChildIDs} from "../../../../store/reducers";
import {Map} from "../Map";
import {Log} from "../../../../Frame/General/Logging";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import V from "../../../../Frame/V/V";
import {MapNodeView, ACTMapNodeSelect, ACTMapNodeExpandedToggle, ACTMapNodePanelOpen} from "../../../../store/Store/Main/MapViews";
import * as VMenuTest1 from "react-vmenu";
import VMenu, {VMenuItem} from "react-vmenu";
import Select from "../../../../Frame/ReactComponents/Select";
import {GetEntries} from "../../../../Frame/General/Enums";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {DN, ToJSON} from "../../../../Frame/General/Globals";
import {DataSnapshot} from "firebase";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import {createSelector} from "reselect";
import NodeUI_Inner from "./NodeUI_Inner";
import {nodeTypeFontSizes} from "./NodeUI_Inner";
import {createMarkupForStyles} from "react/lib/CSSPropertyOperations";
import NodeConnectorBackground from "./NodeConnectorBackground";
import {Vector2i} from "../../../../Frame/General/VectorStructs";

// modified version which only requests paths that do not yet exist in the store
export function FirebaseConnect(innerFirebaseConnect) {
	return firebaseConnect(props=> {
		let firebase = store.getState().firebase;

		let innerPaths = innerFirebaseConnect(props) as string[];
		// if inner-paths are all already loaded, don't request the paths this time
		let innerPaths_unrequested = innerPaths.Where(path=>GetData(firebase, path) == null);
		/*Log(innerPaths.length + ";" + innerPaths_unrequested.length + "\n" + innerPaths + "\n" + innerPaths_unrequested);
		if (GetTimeSinceLoad() > 5)
			debugger;*/
		return innerPaths_unrequested;
	});
}

type Props = {map: Map, node: MapNode, path?: string, widthOverride?: number} & Partial<{nodeView: MapNodeView, nodeChildren: MapNode[]}>;
@FirebaseConnect(({node}: {node: MapNode})=>[
	...MakeGetNodeChildIDs()({}, {node}).Select(a=>DBPath(`nodes/e${a}`))
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
@SimpleShouldUpdate
export default class NodeUI extends BaseComponent<Props, {childrenWidthOverride: number, childrenCenterY: number}> {
	/*shouldComponentUpdate(newProps: Props, newState) {
		/*if (ToJSON(oldProps.Excluding("nodeView")) != ToJSON(newProps.Excluding("nodeView")))
			return true;
		if (oldProps.nodeView.expanded != newProps.nodeView.expanded || oldProps.nodeView.selected != newProps.nodeView.selected)
			return true;
		return false;*#/
		var result = ShallowCompare(this, newProps, newState);
		if (GetTimeSinceLoad() > 5)
			debugger;
		return result;
	}*/

	render() {
		let {map, node, path, widthOverride, nodeView, nodeChildren, children} = this.props;
		let {childrenWidthOverride, childrenCenterY} = this.state;
		//Log("Updating MapNodeUI:" + nodeID);

		let separateChildren = node.type == MapNodeType.Thesis;
		let upChildren = node.type == MapNodeType.Thesis ? nodeChildren.Where(a=>a.type == MapNodeType.SupportingArgument) : [];
		let downChildren = node.type == MapNodeType.Thesis ? nodeChildren.Where(a=>a.type == MapNodeType.OpposingArgument) : [];

		let fontSize = nodeTypeFontSizes[node.type] || 14;
		let expectedTextWidth = V.GetContentWidth($(`<a style='${createMarkupForStyles({fontSize, whiteSpace: "nowrap"})}'>${node.title}</a>`));
		//let expectedOtherStuffWidth = 26;
		let expectedOtherStuffWidth = 28;
		let expectedBoxWidth = expectedTextWidth + expectedOtherStuffWidth;

		let minWidth = node.type == MapNodeType.Thesis ? 350 : 100;
		let maxWidth = node.type == MapNodeType.Thesis ? 550 : 200;
		let width = expectedBoxWidth.KeepBetween(minWidth, maxWidth);

		let maxTextWidth = width - expectedOtherStuffWidth;
		let expectedTextHeight = V.GetContentHeight($(`<a style='${
			createMarkupForStyles({fontSize: fontSize, whiteSpace: "initial", display: "inline-block", width: maxTextWidth})
		}'>${node.title}</a>`));
		let expectedHeight = expectedTextHeight + 10; // * + top-plus-bottom-padding
		//this.Extend({expectedTextWidth, maxTextWidth, expectedTextHeight, expectedHeight}); // for debugging
		
		let innerBoxOffset = ((childrenCenterY|0) - (expectedHeight / 2)).KeepAtLeast(0);
		if (this.lastRender_source == RenderSource.SetState) {
			var holderOffset = new Vector2i(FindDOM_(this.refs.childHolder).offset());
			let innerBox = FindDOM_(this.refs.innerBox);
			//var mainBoxOffset = new Vector2i(innerBox.offset()).Minus(holderOffset);
			var mainBoxOffset = new Vector2i(0, innerBoxOffset);
			//mainBoxOffset = mainBoxOffset.Plus(new Vector2i(innerBox.width(), innerBox.outerHeight() / 2));
			mainBoxOffset = mainBoxOffset.Plus(new Vector2i(-30, innerBox.outerHeight() / 2));
			var oldChildBoxOffsets = this.childBoxes.Where(a=>a != null).Select(child=> {
				let childBox = FindDOM_(child);
				let childBoxOffset = new Vector2i(childBox.offset()).Minus(holderOffset);
				childBoxOffset = childBoxOffset.Plus(new Vector2i(0, childBox.outerHeight() / 2));
				return childBoxOffset;
			});
		}
		this.childBoxes = [];
		return (
			<div className="clickThrough" style={{position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0}}>
				<div className="clickThrough" ref="innerBoxHolder" style={{
					paddingTop: innerBoxOffset,
				}}>
					<NodeUI_Inner ref="innerBox" /*ref={c=>(this as any).innerBox = c}*/ map={map} node={node} nodeView={nodeView} path={path} width={width} widthOverride={widthOverride}/>
				</div>
				{!separateChildren &&
					<div ref="childHolder" className="clickThrough" style={{
						display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 30,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: nodeView && nodeView.expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{this.lastRender_source == RenderSource.SetState &&
							<NodeConnectorBackground node={node} mainBoxOffset={mainBoxOffset} childNodes={nodeChildren} childBoxOffsets={oldChildBoxOffsets}/>}
						{nodeChildren.map((child, index)=> {
							return <NodeUI key={index} ref={c=>this.childBoxes.push(c)} map={map} node={child} path={path + "/" + child._key.KeyToInt} widthOverride={childrenWidthOverride}/>;
						})}
					</div>}
				{separateChildren &&
					<div ref="childHolder" className="clickThrough" style={{
						display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 30,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: nodeView && nodeView.expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{this.lastRender_source == RenderSource.SetState &&
							<NodeConnectorBackground node={node} mainBoxOffset={mainBoxOffset} childNodes={upChildren.concat(downChildren)} childBoxOffsets={oldChildBoxOffsets}/>}
						<div ref="upChildHolder" className="clickThrough" style={{display: "flex", flexDirection: "column"}}>
							{upChildren.map((child, index)=> {
								return <NodeUI key={"up_" + index} ref={c=>this.childBoxes.push(c)} map={map} node={child} path={path + "/" + child._key.KeyToInt} widthOverride={childrenWidthOverride}/>;
							})}
						</div>
						<div ref="downChildHolder" className="clickThrough" style={{display: "flex", flexDirection: "column"}}>
							{downChildren.map((child, index)=> {
								return <NodeUI key={"down_" + index} ref={c=>this.childBoxes.push(c)} map={map} node={child} path={path + "/" + child._key.KeyToInt} widthOverride={childrenWidthOverride}/>;
							})}
						</div>
					</div>}
			</div>
		);
	}
	childBoxes: NodeUI[];
	PostRender() {
		if (this.lastRender_source == RenderSource.SetState) return;
		let {childHolder, upChildHolder} = this.refs;
		this.SetState({
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
		});
	}
}

/*interface JQuery {
	positionFrom(referenceControl): void;
}*/
/*setTimeout(()=>$.fn.positionFrom = function(referenceControl) {
	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return {left: offset.left - referenceControlOffset.left, top: offset.top - referenceControlOffset.top};
});*/