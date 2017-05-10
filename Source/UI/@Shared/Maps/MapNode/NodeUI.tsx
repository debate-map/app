import {BaseComponent, Div, Span, Instant, FindDOM, SimpleShouldUpdate, BaseProps, GetInnerComp, ShallowCompare, RenderSource, FindDOM_} from "../../../../Frame/UI/ReactGlobals";
import {connect} from "react-redux";
import {DBPath, GetData} from "../../../../Frame/Database/DatabaseHelpers";
import {Debugger, QuickIncrement, E, GetTimeSinceLoad} from "../../../../Frame/General/Globals_Free";
import Button from "../../../../Frame/ReactComponents/Button";
import {PropTypes, Component} from "react";
import Action from "../../../../Frame/General/Action";
import {Log} from "../../../../Frame/General/Logging";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import V from "../../../../Frame/V/V";
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
import {createMarkupForStyles} from "react-dom/lib/CSSPropertyOperations";
import NodeConnectorBackground from "./NodeConnectorBackground";
import {Vector2i} from "../../../../Frame/General/VectorStructs";
import {CachedTransform, CombineDynamicPropMaps} from "../../../../Frame/V/VCache";
import {RootState} from "../../../../Store/index";
import {GetNodeView} from "../../../../Store/main/mapViews";
import {MapNode, ThesisForm, MapNodeEnhanced} from "../../../../Store/firebase/nodes/@MapNode";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {GetNodeChildren, GetParentNode, GetNodeChildrenEnhanced} from "../../../../Store/firebase/nodes";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {MapNodeType, MapNodeType_Info} from "../../../../Store/firebase/nodes/@MapNodeType";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetFillPercentForRatingAverage, GetRatingAverage} from "../../../../Store/firebase/nodeRatings";
import Column from "../../../../Frame/ReactComponents/Column";
import {GetRatingTypesForNode, GetNodeDisplayText, GetFontSizeForNode, GetNodeForm, GetFinalNodeTypeAtPath, GetMainRatingType, GetNodeEnhanced, GetSortByRatingType} from "../../../../Store/firebase/nodes/$node";

// modified version which only requests paths that do not yet exist in the store
/*export function Firebase_Connect(innerFirebaseConnect) {
	return firebaseConnect(props=> {
		let firebase = State().firebase;

		let innerPaths = innerFirebaseConnect(props) as string[];
		// if inner-paths are all already loaded, don't request the paths this time
		let innerPaths_unrequested = innerPaths.Where(path=>GetData(firebase, path) == null);
		/*Log(innerPaths.length + ";" + innerPaths_unrequested.length + "\n" + innerPaths + "\n" + innerPaths_unrequested);
		if (GetTimeSinceLoad() > 5)
			debugger;*#/
		return innerPaths_unrequested;
	});
}*/

let childrenPlaceholder = [];

type Props = {map: Map, node: MapNodeEnhanced, path?: string, widthOverride?: number, onHeightOrPosChange?: ()=>void}
	& Partial<{form: ThesisForm, nodeView: MapNodeView,
		nodeChildren: MapNodeEnhanced[],
		//nodeChildren_fillPercents: number[],
		nodeChildren_sortValues: number[],
	}>;
type State = {hasBeenExpanded: boolean, childrenWidthOverride: number, childrenCenterY: number, svgInfo: {mainBoxOffset: Vector2i, oldChildBoxOffsets: Vector2i[]}};
@Connect((state: RootState, {node, path, map}: Props & BaseProps)=> {
	//Log("Calling NodeUI connect func.");
	let nodeView = GetNodeView(map._id, path) || new MapNodeView();

	let nodeChildren = GetNodeChildrenEnhanced(node, path);
	// only pass nodeChildren when all are loaded
	nodeChildren = nodeChildren.Any(a=>a == null) ? childrenPlaceholder : nodeChildren;
	/*let nodeChildren_finalTypes = nodeChildren == childrenPlaceholder ? childrenPlaceholder : nodeChildren.map(child=> {
		return GetFinalNodeTypeAtPath(child, path + "/" + child._id);
	});*/

	let nodeChildren_sortValues = nodeChildren == childrenPlaceholder ? childrenPlaceholder : nodeChildren.map(child=> {
		return GetFillPercentForRatingAverage(child, GetRatingAverage(child._id, GetSortByRatingType(child)), GetNodeForm(child) == ThesisForm.Negation);
	});
	let nodeChildren_fillPercents = nodeChildren == childrenPlaceholder ? childrenPlaceholder : nodeChildren.map(child=> {
		return GetFillPercentForRatingAverage(child, GetRatingAverage(child._id, GetMainRatingType(child)), GetNodeForm(child) == ThesisForm.Negation);
	});
	
	return {
		path: path || node._id.toString(),

		//node_finalType: GetFinalNodeTypeAtPath(node, path),
		//nodeEnhanced: GetNodeEnhanced(node, path),
		form: GetNodeForm(node, GetParentNode(path)),
		// only pass new nodeView when its local-props are different
		nodeView: CachedTransform("nodeView_transform1", [map._id, path], nodeView.Excluding("focus", "viewOffset", "children"), ()=>nodeView),
		/*nodeChildren: CachedTransform("nodeChildren_transform1", {path}, CombineDynamicPropMaps(nodeChildren, nodeChildren_finalTypes),
			()=>nodeChildren.map((child, index)=> {
				return child.Extended({finalType: nodeChildren_finalTypes[index]});
			})),*/
		nodeChildren,
		nodeChildren_sortValues: CachedTransform("nodeChildren_sortValues_transform1", [node._id], nodeChildren_sortValues, ()=>nodeChildren_sortValues),
		nodeChildren_fillPercents: CachedTransform("nodeChildren_fillPercents_transform1", [node._id], nodeChildren_fillPercents, ()=>nodeChildren_fillPercents),
	};
})
export default class NodeUI extends BaseComponent<Props, State> {
	static renderCount = 0;
	static lastRenderTime = -1;
	
	constructor(props) {
		super(props);
		this.state = {svgInfo: {}} as any;
	}
	ComponentWillMountOrReceiveProps(newProps) {
		let {nodeView} = newProps;
		if (nodeView && nodeView.expanded)
			this.SetState({hasBeenExpanded: true});
	}

	/*shouldComponentUpdate(nextProps, nextState) {
		debugger;
		return true;
	}*/

	render() {
		let {map, node, path, form, widthOverride, children, nodeView, nodeChildren, nodeChildren_sortValues} = this.props;
		let expanded = nodeView && nodeView.expanded;
		let {hasBeenExpanded, childrenWidthOverride, childrenCenterY, svgInfo} = this.state;
		//Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node._id};PropsChanged:${this.GetPropsChanged()};StateChanged:${this.GetStateChanged()}`);
		NodeUI.renderCount++;
		NodeUI.lastRenderTime = Date.now();

		let separateChildren = node.finalType == MapNodeType.Thesis;
		type ChildPack = {origIndex: number, node: MapNodeEnhanced, ui: JSX.Element};
		let childPacks: ChildPack[] = nodeChildren.map((child, index)=> {
			return {
				origIndex: index,
				node: child,
				ui: <NodeUI key={index} ref={c=>this.childBoxes[index] = c} map={map} node={child}
					path={path + "/" + child._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}/>
			};
		});
		let upChildPacks = separateChildren ? childPacks.filter(a=>a.node.finalType == MapNodeType.SupportingArgument) : [];
		let downChildPacks = separateChildren ? childPacks.filter(a=>a.node.finalType == MapNodeType.OpposingArgument) : [];

		// apply sorting
		if (separateChildren) {
			upChildPacks = upChildPacks.OrderBy(pack=>nodeChildren_sortValues[pack.origIndex]);
			downChildPacks = downChildPacks.OrderByDescending(pack=>nodeChildren_sortValues[pack.origIndex]);
		} else {
			childPacks = childPacks.OrderByDescending(pack=>pack.node.metaThesis ? 101 : nodeChildren_sortValues[pack.origIndex]);
		}

		let {width, expectedHeight} = this.GetMeasurementInfo(this.props, this.state);
		let innerBoxOffset = ((childrenCenterY|0) - (expectedHeight / 2)).KeepAtLeast(0);

		this.childBoxes = [];
		return (
			<div className="NodeUI clickThrough" style={{position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0}}>
				<div ref="innerBoxHolder" className="innerBoxHolder clickThrough" style={E(
					/*useAutoOffset && {display: "flex", height: "100%", flexDirection: "column", justifyContent: "center"},
					!useAutoOffset && {paddingTop: innerBoxOffset},*/
					{paddingTop: innerBoxOffset}
				)}>
					<NodeUI_Inner ref="innerBox" map={map} node={node} nodeView={nodeView} path={path} width={width} widthOverride={widthOverride}/>
					{/*<NodeUI_Inner ref="innerBox" {...{map, node: nodeWithFinalType, nodeView, path, width}} widthOverride={widthOverride}/>*/}
				</div>
				{nodeChildren == childrenPlaceholder &&
					<div style={{margin: "auto 0 auto 10px"}}>...</div>}
				{nodeChildren != childrenPlaceholder && !expanded && nodeChildren.length != 0 &&
					<div style={{margin: "auto 0 auto 7px", fontSize: 12, color: "rgba(255,255,255,.5)"}}>{nodeChildren.length}</div>}
				{hasBeenExpanded && !separateChildren &&
					<div ref="childHolder" className="childHolder clickThrough" style={{
						display: expanded ? "flex" : "none", flexDirection: "column", marginLeft: 30,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{svgInfo.mainBoxOffset &&
							<NodeConnectorBackground node={node} mainBoxOffset={svgInfo.mainBoxOffset} shouldUpdate={this.lastRender_source == RenderSource.SetState}
								childNodes={nodeChildren} childBoxOffsets={svgInfo.oldChildBoxOffsets}/>}
						{childPacks.map(a=>a.ui)}
					</div>}
				{hasBeenExpanded && separateChildren &&
					<div ref="childHolder" className="childHolder clickThrough" style={{
						display: expanded ? "flex" : "none", flexDirection: "column", marginLeft: 30,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{svgInfo.mainBoxOffset &&
							<NodeConnectorBackground node={node} mainBoxOffset={svgInfo.mainBoxOffset} shouldUpdate={this.lastRender_source == RenderSource.SetState}
								childNodes={nodeChildren} childBoxOffsets={svgInfo.oldChildBoxOffsets}/>}
						<div ref="upChildHolder" className="upChildHolder clickThrough" style={{display: "flex", flexDirection: "column"}}>
							{upChildPacks.map(a=>a.ui)}
						</div>
						<div ref="downChildHolder" className="clickThrough" style={{display: "flex", flexDirection: "column"}}>
							{downChildPacks.map(a=>a.ui)}
						</div>
					</div>}
			</div>
		);
	}
	childBoxes: NodeUI[];

	GetMeasurementInfo(props: Props, state: State) {
		let {node, path} = this.props;
		let nodeTypeInfo = MapNodeType_Info.for[node.type];

		let displayText = GetNodeDisplayText(node, path);
		let fontSize = GetFontSizeForNode(node);
		let expectedTextWidth = V.GetContentWidth($(`<a style='${createMarkupForStyles({fontSize, whiteSpace: "nowrap"})}'>${displayText}</a>`));
		//let expectedOtherStuffWidth = 26;
		let expectedOtherStuffWidth = 28;
		if (node.contentNode)
			expectedOtherStuffWidth += 14;
		let expectedBoxWidth = expectedTextWidth + expectedOtherStuffWidth;
		if (node.contentNode) // quotes are often long, so just always do full-width
			expectedBoxWidth = nodeTypeInfo.maxWidth;

		let width = expectedBoxWidth.KeepBetween(nodeTypeInfo.minWidth, nodeTypeInfo.maxWidth);

		let maxTextWidth = width - expectedOtherStuffWidth;
		let expectedTextHeight = V.GetContentHeight($(`<a style='${
			createMarkupForStyles({fontSize, whiteSpace: "initial", display: "inline-block", width: maxTextWidth})
		}'>${displayText}</a>`));
		let expectedHeight = expectedTextHeight + 10; // * + top-plus-bottom-padding
		//this.Extend({expectedTextWidth, maxTextWidth, expectedTextHeight, expectedHeight}); // for debugging

		return {width, expectedHeight};
	}

	lastHeight = 0;
	lastPos = 0;
	PostRender() {
		//if (this.lastRender_source == RenderSource.SetState) return;

		let height = FindDOM_(this).outerHeight();
		let pos = this.state.childrenCenterY|0;
		if (height != this.lastHeight || pos != this.lastPos) {
			this.OnHeightOrPosChange();
		} else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateState();
		}
		this.lastHeight = height;
		this.lastPos = pos;
	}
	onHeightOrPosChangeQueued = false;
	OnChildHeightOrPosChange() {
		//this.OnHeightOrPosChange();
		// wait one frame, so that if multiple calls to this method occur in the same frame, we only have to call OnHeightOrPosChange() once
		if (!this.onHeightOrPosChangeQueued) {
			this.onHeightOrPosChangeQueued = true;
			requestAnimationFrame(()=> {
				if (!this.mounted) return;
				this.OnHeightOrPosChange();
				this.onHeightOrPosChangeQueued = false;
			});
		}
	}

	OnHeightOrPosChange() {
		let {onHeightOrPosChange} = this.props;
		//Log(`OnHeightOrPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id};centerY:${this.state.childrenCenterY}`);
		this.UpdateState(true);
		if (onHeightOrPosChange) onHeightOrPosChange();
	}
	UpdateState(forceUpdate = false) {
		let {nodeView} = this.props;
		//let {childHolder, upChildHolder} = this.refs;
		let childHolder = FindDOM_(this).children(".childHolder");
		let upChildHolder = childHolder.children(".upChildHolder");

		let newState = E(
			nodeView && nodeView.expanded &&
				{childrenWidthOverride: this.childBoxes.Any(a=>a != null)
					? this.childBoxes.Where(a=>a != null).Select(a=> {
						var childDOM = FindDOM(GetInnerComp(a).refs.innerBox);
						var oldMinWidth = childDOM.style.minWidth;
						childDOM.style.minWidth = 0 + "px";
						var result = childDOM.clientWidth;
						childDOM.style.minWidth = oldMinWidth;
						return result;
					}).Max(null, true)
					: 0},
			/*{childrenCenterY: upChildHolder
				? (upChildHolder && upChildHolder.style.display != "none" ? upChildHolder.clientHeight : 0)
				: (childHolder && childHolder.style.display != "none" ? childHolder.clientHeight / 2 : 0)}*/
			{childrenCenterY: upChildHolder.length
				? (upChildHolder.css("display") != "none" ? upChildHolder.outerHeight() : 0)
				: (childHolder.css("display") != "none" ? childHolder.outerHeight() / 2 : 0)}
		) as State;

		let {expectedHeight} = this.GetMeasurementInfo(this.props, E(this.state, newState) as State);

		let innerBoxOffset = ((newState.childrenCenterY|0) - (expectedHeight / 2)).KeepAtLeast(0);
		//if (this.lastRender_source == RenderSource.SetState && this.refs.childHolder) {
		if (this.refs.childHolder) {
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
			newState.svgInfo = {mainBoxOffset, oldChildBoxOffsets};
		}
		
		var changedState = this.SetState(newState, null, !forceUpdate);
		//Log(`Changed state? (${this.props.node._id}): ` + changedState);
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