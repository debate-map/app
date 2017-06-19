import { ACTMapNodeExpandedSet, ACTMapNodeChildLimitSet } from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {BaseComponent, Div, Span, Instant, FindDOM, SimpleShouldUpdate, BaseProps, GetInnerComp, ShallowCompare, RenderSource, FindDOM_, ShallowEquals} from "../../../../Frame/UI/ReactGlobals";
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
import {GetRatingTypesForNode, GetNodeDisplayText, GetFontSizeForNode, GetNodeForm, GetFinalNodeTypeAtPath, GetMainRatingType, GetNodeEnhanced, GetSortByRatingType, IsArgumentNode, IsReversedArgumentNode} from "../../../../Store/firebase/nodes/$node";
import * as FastDOM from "fastdom";
import Row from "Frame/ReactComponents/Row";
import Icon from "../../../../Frame/ReactComponents/Icon";
import {MetaThesis_IfType} from "../../../../Store/firebase/nodes/@MetaThesisInfo";
import {GetContentWidth, GetContentHeight} from "../../../../Frame/V/V";
import {GetUserAccessLevel} from "../../../../Store/firebase/users";
import {GetUserID} from "Store/firebase/users";
import {IsUserCreatorOrMod} from "../../../../Store/firebase/userExtras";
import {ViewedNodeSet} from "../../../../Store/firebase/userViewedNodes/@ViewedNodeSet";
import {GetUserViewedNodes} from "../../../../Store/firebase/userViewedNodes";
import NotifyNodeViewed from "../../../../Server/Commands/NotifyNodeViewed";
import InfoButton from "../../../../Frame/ReactComponents/InfoButton";

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
	& Partial<{
		initialChildLimit: number, form: ThesisForm, nodeView: MapNodeView,
		nodeChildren: MapNodeEnhanced[],
		//nodeChildren_fillPercents: number[],
		nodeChildren_sortValues: number[],
		userViewedNodes: ViewedNodeSet,
	}>;
type State = {
	hasBeenExpanded: boolean, childrenWidthOverride: number, childrenCenterY: number,
	svgInfo: {
		mainBoxOffset: Vector2i,
		//oldChildBoxOffsets: Vector2i[],
		oldChildBoxOffsets: {[key: number]: Vector2i},
	},
	//childrenStartY: number, childrenEndY: number, // positions at which to place limit-bars
};
@Connect((state: RootState, {node, path, map}: Props)=> {
	//Log("Calling NodeUI connect func.");
	let nodeView = GetNodeView(map._id, path) || new MapNodeView();

	let nodeChildren = GetNodeChildrenEnhanced(node, path, true);
	// only pass nodeChildren when all are loaded
	nodeChildren = nodeChildren.Any(a=>a == null) ? childrenPlaceholder : nodeChildren;
	/*let nodeChildren_finalTypes = nodeChildren == childrenPlaceholder ? childrenPlaceholder : nodeChildren.map(child=> {
		return GetFinalNodeTypeAtPath(child, path + "/" + child._id);
	});*/

	let nodeChildren_sortValues = nodeChildren == childrenPlaceholder ? childrenPlaceholder : nodeChildren.map(child=> {
		return GetFillPercentForRatingAverage(child, GetRatingAverage(child._id, GetSortByRatingType(child)), GetNodeForm(child) == ThesisForm.Negation);
	});
	/*for (var i = 0; i < nodeChildren.length; i++) {
		let child = nodeChildren[i];
		if (child.chainAfter == "[start]") {
			nodeChildren_sortValues[i] = -1;
			continue;
		}
		let chainAfterNode = nodeChildren.FirstOrX(a=>a._id.toString() == child.chainAfter);
		if (chainAfterNode) {
			let chainAfterNode_sortValue = nodeChildren_sortValues[nodeChildren.indexOf(chainAfterNode)];
			nodeChildren_sortValues[i] = chainAfterNode_sortValue + .000001;
		}
	}*/
	let nodeChildren_fillPercents = nodeChildren == childrenPlaceholder ? childrenPlaceholder : nodeChildren.map(child=> {
		return GetFillPercentForRatingAverage(child, GetRatingAverage(child._id, GetMainRatingType(child)), GetNodeForm(child) == ThesisForm.Negation);
	});
	
	return {
		path: path || node._id.toString(),

		initialChildLimit: State(a=>a.main.initialChildLimit),
		//node_finalType: GetFinalNodeTypeAtPath(node, path),
		//nodeEnhanced: GetNodeEnhanced(node, path),
		form: GetNodeForm(node, GetParentNode(path)),
		// only pass new nodeView when its local-props are different
		nodeView: CachedTransform("nodeView_transform1", [map._id, path], nodeView.Excluding("focused", "viewOffset", "children"), ()=>nodeView),
		/*nodeChildren: CachedTransform("nodeChildren_transform1", {path}, CombineDynamicPropMaps(nodeChildren, nodeChildren_finalTypes),
			()=>nodeChildren.map((child, index)=> {
				return child.Extended({finalType: nodeChildren_finalTypes[index]});
			})),*/
		nodeChildren,
		nodeChildren_sortValues: CachedTransform("nodeChildren_sortValues_transform1", [node._id], nodeChildren_sortValues, ()=>nodeChildren_sortValues),
		nodeChildren_fillPercents: CachedTransform("nodeChildren_fillPercents_transform1", [node._id], nodeChildren_fillPercents, ()=>nodeChildren_fillPercents),
		userViewedNodes: GetUserViewedNodes(GetUserID(), {useUndefinedForInProgress: true}),
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
		if (nodeView) {
			if (nodeView.expanded) {
				this.SetState({hasBeenExpanded: true}, null, false);
			} else {
				// if non-expanded, always have node-box at the very top (fixes that an extra render was occuring, when collapsing a node)
				//this.SetState({svgInfo: null, childrenCenterY: 0}, null, false);
				//this.SetState({childrenCenterY: 0}, null, false);
			}
		}
	}

	render() {
		let {map, node, path, initialChildLimit, form, widthOverride, children, nodeView, nodeChildren, nodeChildren_sortValues} = this.props;
		let expanded = nodeView && nodeView.expanded;
		let {hasBeenExpanded, childrenWidthOverride, childrenCenterY, svgInfo, /*childrenStartY, childrenEndY*/} = this.state;
		if (ShouldLog(a=>a.nodeRenders)) {
			if (logTypes.nodeRenders_for) {
				if (logTypes.nodeRenders_for == node._id) {
					Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node._id}${nl
						}PropsChanged:${this.GetPropsChanged_Data()}${nl
						}StateChanged:${this.GetStateChanged_Data()}`);
				}
			} else {
				Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node._id}${nl
					}PropsChanged:${this.GetPropsChanged()}${nl
					}StateChanged:${this.GetStateChanged()}`);
			}
		}
		NodeUI.renderCount++;
		NodeUI.lastRenderTime = Date.now();

		let separateChildren = node.finalType == MapNodeType.Thesis;
		type ChildPack = {origIndex: number, node: MapNodeEnhanced};
		let childPacks: ChildPack[] = nodeChildren.map((child, index)=>({origIndex: index, node: child}));
		let upChildPacks = separateChildren ? childPacks.filter(a=>a.node.finalType == MapNodeType.SupportingArgument) : [];
		let downChildPacks = separateChildren ? childPacks.filter(a=>a.node.finalType == MapNodeType.OpposingArgument) : [];

		let childLimit_up = ((nodeView || {}).childLimit_up || initialChildLimit).KeepAtLeast(initialChildLimit);
		let childLimit_down = ((nodeView || {}).childLimit_down || initialChildLimit).KeepAtLeast(initialChildLimit);
		// if the map's root node, or an argument node, show all children
		let showAll = node._id == map.rootNode || IsArgumentNode(node);
		if (showAll) [childLimit_up, childLimit_down] = [100, 100];

		// apply sorting
		if (separateChildren) {
			upChildPacks = upChildPacks.OrderBy(pack=>nodeChildren_sortValues[pack.origIndex]);
			downChildPacks = downChildPacks.OrderByDescending(pack=>nodeChildren_sortValues[pack.origIndex]);
		} else {
			childPacks = childPacks.OrderByDescending(pack=>nodeChildren_sortValues[pack.origIndex]);
			//if (IsArgumentNode(node)) {
			let metaThesisNode = nodeChildren.FirstOrX(a=>a.metaThesis != null);
			let isArgument_any = metaThesisNode && metaThesisNode.metaThesis.ifType == MetaThesis_IfType.Any;
			if (node.childrenOrder && !isArgument_any) {
				childPacks = childPacks.OrderBy(pack=>node.childrenOrder.indexOf(pack.node._id).IfN1Then(Number.MAX_SAFE_INTEGER));
			}
		}

		//let {width, expectedHeight} = this.GetMeasurementInfo(this.props, this.state);
		let {width, expectedHeight} = this.GetMeasurementInfo();
		let innerBoxOffset = ((childrenCenterY|0) - (expectedHeight / 2)).KeepAtLeast(0);
		if (!expanded) innerBoxOffset = 0;

		let showLimitBar = !!children; // the only type of child we ever pass into NodeUI is a LimitBar
		let limitBar_above = node.type == MapNodeType.SupportingArgument;
		if (IsReversedArgumentNode(node)) limitBar_above = !limitBar_above;
		/*let minChildCount = GetMinChildCountToBeVisibleToNonModNonCreators(node, nodeChildren);
		let showBelowMessage = nodeChildren.length > 0 && nodeChildren.length < minChildCount;*/
		
		this.childBoxes = {};
		return (
			<div className="NodeUI clickThrough" style={{position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0}}>
				<div ref="innerBoxHolder" className="innerBoxHolder clickThrough" style={E(
					//{position: "relative"},
					/*useAutoOffset && {display: "flex", height: "100%", flexDirection: "column", justifyContent: "center"},
					!useAutoOffset && {paddingTop: innerBoxOffset},*/
					{paddingTop: innerBoxOffset}
				)}>
					{limitBar_above && children}
					<NodeUI_Inner ref="innerBox" map={map} node={node} nodeView={nodeView} path={path} width={width} widthOverride={widthOverride}/>
					{/*<NodeUI_Inner ref="innerBox" {...{map, node: nodeWithFinalType, nodeView, path, width}} widthOverride={widthOverride}/>*/}
					{/*showBelowMessage &&
						<Div ct style={{
							//whiteSpace: "normal", position: "absolute", left: 0, right: 0, top: "100%", fontSize: 12
							marginTop: 5, fontSize: 12,
							width: 0, // fixes that link-lines would have gap on left
						}}>
							Needs 2 premises to be visible.
						</Div>*/}
					{!limitBar_above && children}
				</div>
				{nodeChildren == childrenPlaceholder &&
					<div style={{margin: "auto 0 auto 10px"}}>...</div>}
				{nodeChildren != childrenPlaceholder && !expanded && nodeChildren.length != 0 &&
					<div style={E({
						margin: "auto 0 auto 7px", fontSize: 12, color: "rgba(255,255,255,.5)"},
						/*showLimitBar && {[limitBar_above ? "paddingTop" : "paddingBottom"]: ChildLimitBar.HEIGHT},
						showBelowMessage && {paddingBottom: 13},*/
						showLimitBar && limitBar_above && {paddingTop: ChildLimitBar.HEIGHT},
						{paddingBottom: 0 + /*(showBelowMessage ? 13 : 0) +*/ (showLimitBar && !limitBar_above ? ChildLimitBar.HEIGHT : 0)}
					)}>
						{nodeChildren.length}
					</div>}
				{hasBeenExpanded && !separateChildren &&
					<div ref="childHolder" className="childHolder clickThrough" style={{
						display: expanded ? "flex" : "none", flexDirection: "column", marginLeft: 30,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{svgInfo.mainBoxOffset &&
							<NodeConnectorBackground node={node} mainBoxOffset={svgInfo.mainBoxOffset} shouldUpdate={this.lastRender_source == RenderSource.SetState}
								childNodes={nodeChildren} childBoxOffsets={svgInfo.oldChildBoxOffsets}/>}
						{childPacks.slice(0, childLimit_down).map((pack, index)=> {
							return (
								<NodeUI key={pack.origIndex} ref={c=>this.childBoxes[pack.node._id] = c} map={map} node={pack.node}
										path={path + "/" + pack.node._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}>
									{index == childLimit_down - 1 && (childPacks.length > childLimit_down || childLimit_down != initialChildLimit) &&
										<ChildLimitBar key={index} {...{map, path, childrenWidthOverride, childLimit: childLimit_down}}
											direction="down" childCount={childPacks.length}/>}
								</NodeUI>
							);
						})}
					</div>}
				{hasBeenExpanded && separateChildren &&
					<div ref="childHolder" className="childHolder clickThrough" style={{
						display: expanded ? "flex" : "none", flexDirection: "column", marginLeft: 30,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{svgInfo.mainBoxOffset &&
							<NodeConnectorBackground node={node} mainBoxOffset={svgInfo.mainBoxOffset} shouldUpdate={this.lastRender_source == RenderSource.SetState}
								childNodes={nodeChildren} childBoxOffsets={svgInfo.oldChildBoxOffsets}/>}
						<Column ref="upChildHolder" ct className="upChildHolder">
							{/*upChildPacks.slice(-childLimit_up).map(a=>a.ui)*/}
							{upChildPacks.slice(-childLimit_up).map((pack, index)=> {
								return (
									<NodeUI key={pack.origIndex} ref={c=>this.childBoxes[pack.node._id] = c} map={map} node={pack.node}
											path={path + "/" + pack.node._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}>
										{index == 0 && !showAll && (upChildPacks.length > childLimit_up || childLimit_up != initialChildLimit) &&
											<ChildLimitBar key={index} {...{map, path, childrenWidthOverride, childLimit: childLimit_up}}
												direction="up" childCount={upChildPacks.length}/>}
									</NodeUI>
								);
							})}
						</Column>
						<Column ref="downChildHolder" ct>
							{/*downChildPacks.slice(0, childLimit_down).map(a=>a.ui)*/}
							{downChildPacks.slice(0, childLimit_down).map((pack, index)=> {
								return (
									<NodeUI key={pack.origIndex} ref={c=>this.childBoxes[pack.node._id] = c} map={map} node={pack.node}
											path={path + "/" + pack.node._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}>
										{index == childLimit_down - 1 && !showAll && (downChildPacks.length > childLimit_down || childLimit_down != initialChildLimit) &&
											<ChildLimitBar key={index} {...{map, path, childrenWidthOverride, childLimit: childLimit_down}}
												direction="down" childCount={downChildPacks.length}/>}
									</NodeUI>
								);
							})}
						</Column>
					</div>}
			</div>
		);
	}
	//childBoxes: NodeUI[];
	childBoxes: {[key: number]: NodeUI};

	//GetMeasurementInfo(/*props: Props, state: State*/) {
	measurementInfo_cache;
	measurementInfo_cache_lastUsedProps;
	/*ComponentWillReceiveProps(newProps) {
		this.GetMeasurementInfo(newProps, false); // refresh measurement-info when props change
	}*/
	//GetMeasurementInfo(useCached: boolean) {
	GetMeasurementInfo() {
		let props_used = this.props.Including("node", "path") as any;
		//Log("Checking whether should remeasure info for: " + props_used.node._id);
		if (this.measurementInfo_cache && ShallowEquals(this.measurementInfo_cache_lastUsedProps, props_used)) return this.measurementInfo_cache;

		let {node, path} = props_used as Props;
		let nodeTypeInfo = MapNodeType_Info.for[node.type];

		let displayText = GetNodeDisplayText(node, path);
		let fontSize = GetFontSizeForNode(node);
		let expectedTextWidth = GetContentWidth($(`<span style='${createMarkupForStyles({fontSize, whiteSpace: "nowrap"})}'>${displayText}</span>`));

		let noteWidth = 0;
		if (node.note) {
			noteWidth = Math.max(noteWidth,
				GetContentWidth($(`<span style='${createMarkupForStyles({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>${node.note}</span>`), true));
		}
		if (node.equation && node.equation.explanation) {
			noteWidth = Math.max(noteWidth,
				GetContentWidth($(`<span style='${createMarkupForStyles({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>${node.equation.explanation}</span>`), true));
		}
		expectedTextWidth += noteWidth;

		//let expectedOtherStuffWidth = 26;
		let expectedOtherStuffWidth = 28;
		if (node.contentNode)
			expectedOtherStuffWidth += 14;
		let expectedBoxWidth = expectedTextWidth + expectedOtherStuffWidth;
		if (node.contentNode) // quotes are often long, so just always do full-width
			expectedBoxWidth = nodeTypeInfo.maxWidth;

		let width = node.widthOverride || expectedBoxWidth.KeepBetween(nodeTypeInfo.minWidth, nodeTypeInfo.maxWidth);

		let maxTextWidth = width - expectedOtherStuffWidth;
		let expectedTextHeight = GetContentHeight($(`<a style='${
			createMarkupForStyles({fontSize, whiteSpace: "initial", display: "inline-block", width: maxTextWidth})
		}'>${displayText}</a>`));
		let expectedHeight = expectedTextHeight + 10; // * + top-plus-bottom-padding
		//this.Extend({expectedTextWidth, maxTextWidth, expectedTextHeight, expectedHeight}); // for debugging

		this.measurementInfo_cache = {expectedBoxWidth, width, expectedHeight};
		this.measurementInfo_cache_lastUsedProps = props_used;
		return this.measurementInfo_cache;
	}

	lastHeight = 0;
	lastPos = 0;
	PostRender() {
		//if (this.lastRender_source == RenderSource.SetState) return;

		let height = FindDOM_(this).outerHeight();
		let pos = this.state.childrenCenterY|0;
		if (height != this.lastHeight) {
			this.OnHeightChange();
		} else if (pos != this.lastPos) {
			this.OnPosChange();
		} else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateState();
		}
		this.lastHeight = height;
		this.lastPos = pos;
	}
	ComponentDidMount() {
		let {node, userViewedNodes} = this.props;
		let userViewedNodes_doneLoading = userViewedNodes !== undefined;
		if (userViewedNodes_doneLoading && !(userViewedNodes || {}).VKeys(true).map(ToInt).Contains(node._id)) {
			new NotifyNodeViewed({nodeID: node._id}).Run();
		}
	}
	OnChildHeightOrPosChange_updateStateQueued = false;
	OnChildHeightOrPosChange() {
		if (g.OnChildHeightOrPosChange_log) {
			Log(`OnChildHeightOrPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
				}centerY:${this.state.childrenCenterY}`);
		}

		//this.OnHeightOrPosChange();
		// wait one frame, so that if multiple calls to this method occur in the same frame, we only have to call OnHeightOrPosChange() once
		if (!this.OnChildHeightOrPosChange_updateStateQueued) {
			this.OnChildHeightOrPosChange_updateStateQueued = true;
			requestAnimationFrame(()=> {
				if (!this.mounted) return;
				this.UpdateState();
				this.OnChildHeightOrPosChange_updateStateQueued = false;
			});
		}
	}

	OnHeightChange() {
		let {onHeightOrPosChange} = this.props;
		if (g.OnHeightChange_log) {
			Log(`OnHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
				}centerY:${this.state.childrenCenterY}`);
		}
		
		//this.UpdateState(true);
		this.UpdateState();
		if (onHeightOrPosChange) onHeightOrPosChange();
	}
	OnPosChange() {
		let {onHeightOrPosChange} = this.props;
		if (g.OnPosChange_log) {
			Log(`OnPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
				}centerY:${this.state.childrenCenterY}`);
		}

		if (onHeightOrPosChange) onHeightOrPosChange();
	}
	UpdateState(forceUpdate = false) {
		let {node, children, nodeView} = this.props;
		let expanded = nodeView && nodeView.expanded;
		//let {childHolder, upChildHolder} = this.refs;
		let childHolder = FindDOM_(this).children(".childHolder");
		let upChildHolder = childHolder.children(".upChildHolder");
		let downChildHolder = childHolder.children(".downChildHolder");
		/*let firstChild = (upChildHolder.length ? upChildHolder : childHolder).children().ToList()[0];
		let lastChild = (downChildHolder.length ? downChildHolder : childHolder).children().ToList().Last();*/

		// if children are supposed to show, but are not rendered yet, do not call set-state (yet)
		/*if (expanded) {
			if (upChildHolder.length) {
				if (upChildHolder.css("display") == "none") return;
			} else {
				if (childHolder.css("display") == "none") return;
			}
		}*/

		let newState = E(
			expanded &&
				{childrenWidthOverride: this.childBoxes.VValues().filter(a=>a != null).map(a=> {
					let comp = GetInnerComp(a) as NodeUI;
					return comp.GetMeasurementInfo().width;
				}).concat(0).Max(null, true)},
			/*{childrenCenterY: upChildHolder
				? (upChildHolder && upChildHolder.style.display != "none" ? upChildHolder.clientHeight : 0)
				: (childHolder && childHolder.style.display != "none" ? childHolder.clientHeight / 2 : 0)}*/
			expanded && {childrenCenterY: upChildHolder.length
				? (upChildHolder.css("display") != "none" ? upChildHolder.outerHeight() : 0)
				: (childHolder.css("display") != "none" ? childHolder.outerHeight() / 2 : 0)},
			/*{childrenStartY: upChildHolder.length
				? (upChildHolder.css("display") != "none" ? firstChild.GetScreenRect().y -  : 0)
				: (childHolder.css("display") != "none" ? childHolder.outerHeight() / 2 : 0)}*/
		) as State;

		//let {width, expectedHeight} = this.GetMeasurementInfo(this.props, E(this.state, newState) as State);
		let {expectedBoxWidth, expectedHeight} = this.GetMeasurementInfo();

		let innerBoxOffset = ((newState.childrenCenterY|0) - (expectedHeight / 2)).KeepAtLeast(0);
		//if (this.lastRender_source == RenderSource.SetState && this.refs.childHolder) {
		//if (this.refs.childHolder) {
		if (expanded) {
			let holderOffset = new Vector2i(FindDOM_(this.refs.childHolder).offset());
			let innerBox = FindDOM_(this.refs.innerBox);
			//var mainBoxOffset = new Vector2i(innerBox.offset()).Minus(holderOffset);
			let mainBoxOffset = new Vector2i(0, innerBoxOffset);
			//mainBoxOffset = mainBoxOffset.Plus(new Vector2i(innerBox.width(), innerBox.outerHeight() / 2));
			mainBoxOffset = mainBoxOffset.Plus(new Vector2i(-30, innerBox.outerHeight() / 2));

			let showLimitBar = !!children; // the only type of child we ever pass into NodeUI is a LimitBar
			let limitBar_above = node.type == MapNodeType.SupportingArgument;
			if (IsReversedArgumentNode(node)) limitBar_above = !limitBar_above;
			if (showLimitBar && limitBar_above) mainBoxOffset.y += ChildLimitBar.HEIGHT;

			let oldChildBoxOffsets = this.childBoxes.Props().Where(pair=>pair.value != null).ToMap(pair=>pair.name, pair=> {
				//let childBox = FindDOM_(pair.value).find("> div:first-child > div"); // get inner-box of child
				let childBox = FindDOM_(pair.value).find("> .innerBoxHolder > .NodeUI_Inner"); // get inner-box of child
				let childBoxOffset = new Vector2i(childBox.offset()).Minus(holderOffset);
				childBoxOffset = childBoxOffset.Plus(new Vector2i(0, childBox.outerHeight() / 2));
				return childBoxOffset;
			});
			newState.svgInfo = {mainBoxOffset, oldChildBoxOffsets};
		}
		
		var changedState = this.SetState(newState, null, !forceUpdate, true);
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

@Connect((state, props)=> ({
	initialChildLimit: State(a=>a.main.initialChildLimit),
}))
class ChildLimitBar extends BaseComponent
		<{map: Map, path: string, childrenWidthOverride: number, direction: "up" | "down", childCount: number, childLimit: number}
			& Partial<{initialChildLimit: number}>,
		{}> {
	static HEIGHT = 36;
	render() {
		let {map, path, childrenWidthOverride, direction, childCount, childLimit, initialChildLimit} = this.props;
		return (
			<Row style={{
				//position: "absolute", marginTop: -30,
				[direction == "up" ? "marginBottom" : "marginTop"]: 10, width: childrenWidthOverride, cursor: "default",
			}}>
				<Button text={
					<Row>
						<Icon icon={`arrow-${direction}`} size={15}/>
						<Div ml={3}>{childCount > childLimit ? childCount - childLimit : null}</Div>
					</Row>
				} title="Show more"
				enabled={childLimit < childCount} style={{flex: 1}} onClick={()=> {
					store.dispatch(new ACTMapNodeChildLimitSet({mapID: map._id, path, direction, value: (childLimit + 3).KeepAtMost(childCount)}));
				}}/>
				<Button ml={5} text={
					<Row>
						<Icon icon={`arrow-${direction == "up" ? "down" : "up"}`} size={15}/>
						{/*<Div ml={3}>{childCount > childLimit ? childCount - childLimit : null}</Div>*/}
					</Row>
				} title="Show less"
				enabled={childLimit > initialChildLimit} style={{flex: 1}} onClick={()=> {
					store.dispatch(new ACTMapNodeChildLimitSet({mapID: map._id, path, direction, value: (childLimit - 3).KeepAtLeast(initialChildLimit)}));
				}}/>
			</Row>
		);
	}
}