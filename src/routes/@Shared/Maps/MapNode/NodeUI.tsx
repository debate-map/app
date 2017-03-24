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

type Props = {map: Map, node: MapNode, path?: string, widthOverride?: number, onHeightOrPosChange?: ()=>void} & Partial<{nodeView: MapNodeView, nodeChildren: MapNode[]}>;
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
export default class NodeUI extends BaseComponent<Props, {hasBeenExpanded: boolean, childrenWidthOverride: number, childrenCenterY: number}> {
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

	/*ComponentDidMount() {
		let {node} = this.props;
		Log("Mounting NodeUI:" + node._key.KeyToInt); // + ";PropsChanged:" + this.GetPropsChanged());
	}*/
	ComponentWillReceiveProps(newProps) {
		let {node} = this.props;
		//Log("ReceivingProps NodeUI:" + node._key.KeyToInt); // + ";PropsChanged:" + this.GetPropsChanged());

		let {nodeView} = newProps;
		if (nodeView && nodeView.expanded)
			this.SetState({hasBeenExpanded: true});
	}

	lastSVGInfo = {mainBoxOffset: null as Vector2i, oldChildBoxOffsets: [] as Vector2i[]};
	render() {
		let {map, node, path, widthOverride, nodeView, nodeChildren, children} = this.props;
		let {hasBeenExpanded, childrenWidthOverride, childrenCenterY} = this.state;
		Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node._key.KeyToInt};PropsChanged:${this.GetPropsChanged()};StateChanged:${this.GetStateChanged()}`);

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
		if (this.lastRender_source == RenderSource.SetState && this.refs.childHolder) {
			let holderOffset = new Vector2i(FindDOM_(this.refs.childHolder).offset());
			let innerBox = FindDOM_(this.refs.innerBox);
			//var mainBoxOffset = new Vector2i(innerBox.offset()).Minus(holderOffset);
			let mainBoxOffset = new Vector2i(0, innerBoxOffset);
			//mainBoxOffset = mainBoxOffset.Plus(new Vector2i(innerBox.width(), innerBox.outerHeight() / 2));
			mainBoxOffset = mainBoxOffset.Plus(new Vector2i(-30, innerBox.outerHeight() / 2));
			let oldChildBoxOffsets = this.childBoxes.Where(a=>a != null).Select(child=> {
				let childBox = FindDOM_(child).find("> div:first-child > div"); // get inner-box of child
				let childBoxOffset = new Vector2i(childBox.offset()).Minus(holderOffset);
				childBoxOffset = childBoxOffset.Plus(new Vector2i(0, childBox.outerHeight() / 2));
				return childBoxOffset;
			});
			this.lastSVGInfo = {mainBoxOffset, oldChildBoxOffsets};			
		}
		this.childBoxes = [];
		this.childRenders = 0;
		return (
			<div className="clickThrough" style={{position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0}}>
				<div className="clickThrough" ref="innerBoxHolder" style={{
					paddingTop: innerBoxOffset,
				}}>
					<NodeUI_Inner ref="innerBox" /*ref={c=>(this as any).innerBox = c}*/ map={map} node={node} nodeView={nodeView} path={path} width={width} widthOverride={widthOverride}/>
				</div>
				{hasBeenExpanded && !separateChildren &&
					<div ref="childHolder" className="clickThrough" style={{
						display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 30,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: nodeView && nodeView.expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{this.lastSVGInfo.mainBoxOffset &&
							<NodeConnectorBackground node={node} mainBoxOffset={this.lastSVGInfo.mainBoxOffset}
								childNodes={nodeChildren} childBoxOffsets={this.lastSVGInfo.oldChildBoxOffsets}/>}
						{nodeChildren.map((child, index)=> {
							return <NodeUI key={index} ref={c=>this.PostAddChildBox(c)} map={map} node={child}
								path={path + "/" + child._key.KeyToInt} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}/>;
						})}
					</div>}
				{hasBeenExpanded && separateChildren &&
					<div ref="childHolder" className="clickThrough" style={{
						display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 30,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: nodeView && nodeView.expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{this.lastSVGInfo.mainBoxOffset &&
							<NodeConnectorBackground node={node} mainBoxOffset={this.lastSVGInfo.mainBoxOffset}
								childNodes={upChildren.concat(downChildren)} childBoxOffsets={this.lastSVGInfo.oldChildBoxOffsets}/>}
						<div ref="upChildHolder" className="clickThrough" style={{display: "flex", flexDirection: "column"}}>
							{upChildren.map((child, index)=> {
								return <NodeUI key={"up_" + index} ref={c=>this.PostAddChildBox(c)} map={map} node={child}
									path={path + "/" + child._key.KeyToInt} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}/>;
							})}
						</div>
						<div ref="downChildHolder" className="clickThrough" style={{display: "flex", flexDirection: "column"}}>
							{downChildren.map((child, index)=> {
								return <NodeUI key={"down_" + index} ref={c=>this.PostAddChildBox(c)} map={map} node={child}
									path={path + "/" + child._key.KeyToInt} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}/>;
							})}
						</div>
					</div>}
			</div>
		);
	}
	childBoxes: NodeUI[];
	childRenders = 0;
	PostAddChildBox(box) {
		let {nodeChildren} = this.props;
		this.childBoxes.push(box);
		// if children done rendering
		/*if (this.childBoxes.length == nodeChildren.length) {
			setTimeout(()=>this.PostDescendantsRendered());
		}*/
	}

	//lastExpanded = false;
	lastHeight = 0;
	PostRender() {
		/*let {nodeChildren, nodeView} = this.props;
		let expanded = nodeView && nodeView.expanded;
		// if no children, our post-render means our "descendants are done re-rendering" as well
		// 		(else, we wait for descendants' postRender() callback to trigger)
		if (nodeChildren.length == 0 || expanded != this.lastExpanded)
			//this.PostDescendantsRendered();
			this.OnHeightOrPosChange();
		this.lastExpanded = expanded;*/
		if (this.lastRender_source != RenderSource.SetState) {
			this.UpdateState();
		} else {
			let height = FindDOM_(this).outerHeight();
			if (height != this.lastHeight) {
				this.lastHeight = height;
				this.OnHeightOrPosChange();
			}
		}
	}
	OnChildHeightOrPosChange() {
		this.OnHeightOrPosChange();
		let {onHeightOrPosChange} = this.props;
		if (onHeightOrPosChange) onHeightOrPosChange();
	}

	/*lastHeight = 0;
	PostDescendantsRendered() {
		let height = FindDOM_(this).outerHeight();
		if (height != this.lastHeight) {
			this.lastHeight = height;
			this.OnHeightOrPosChange();
		}
	}*/

	OnHeightOrPosChange() {
		this.UpdateState();
		let {onHeightOrPosChange} = this.props;
		if (onHeightOrPosChange) onHeightOrPosChange();
	}
	UpdateState() {
		let {nodeView} = this.props;
		let {childHolder, upChildHolder} = this.refs;
		var changedState = this.SetState(E(
			nodeView && nodeView.expanded &&
				{childrenWidthOverride: this.childBoxes.Any(a=>a != null)
					? this.childBoxes.Where(a=>a != null).Select(a=> {
						var childDOM = FindDOM(GetInnerComp(a).refs.innerBox);
						var oldMinWidth = childDOM.style.minWidth;
						childDOM.style.minWidth = 0 + "px";
						var result = childDOM.clientWidth;
						childDOM.style.minWidth = oldMinWidth;
						return result;
					}).Max()
					: 0},
			{childrenCenterY: upChildHolder
				? (upChildHolder && upChildHolder.style.display != "none" ? upChildHolder.clientHeight : 0)
				: (childHolder && childHolder.style.display != "none" ? childHolder.clientHeight / 2 : 0)}
		));
		//Log(`Changed state? (${this.props.node._key.KeyToInt}): ` + changedState);
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