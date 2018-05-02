import {BaseComponentWithConnector, BaseComponent, GetInnerComp, RenderSource} from "react-vextensions";
import { Connect } from "Frame/Database/FirebaseConnect";
import {Column, Row, Button, Div} from "react-vcomponents";
import { MapNodeL3 } from "Store/firebase/nodes/@MapNode";
import NodeConnectorBackground from "UI/@Shared/Maps/MapNode/NodeConnectorBackground";
import { NodeUI } from "UI/@Shared/Maps/MapNode/NodeUI";
import {Map} from "../../../../../Store/firebase/maps/@Map";
import { MapNodeView } from "Store/main/mapViews/@MapViews";
import { MapNodeType } from "Store/firebase/nodes/@MapNodeType";
import {Vector2i} from "js-vextensions";
import {ArgumentsControlBar} from "../ArgumentsControlBar";
import {Polarity} from "../../../../../Store/firebase/nodes/@MapNode";
import { ACTMapNodeChildLimitSet } from "Store/main/mapViews/$mapView/rootNodeViews";
import Icon from "Frame/ReactComponents/Icon";
import {IsMultiPremiseArgument, GetSortByRatingType, GetMainRatingType} from "../../../../../Store/firebase/nodes/$node";
import {NodeChildHolderBox, HolderType} from "./NodeChildHolderBox";
import { GetNodeChildrenL3 } from "Store/firebase/nodes";
import { IsSpecialEmptyArray, emptyObj } from "Frame/Store/ReducerUtils";
import { GetRatingAverage_AtPath, GetFillPercent_AtPath } from "Store/firebase/nodeRatings";
import { CachedTransform } from "js-vextensions";
import { ArgumentType } from "Store/firebase/nodes/@MapNodeRevision";
import {SplitStringBySlash_Cached} from "../../../../../Frame/Database/StringSplitCache";

/*export class ChildPackUI extends BaseComponent
		<{
			map: Map, path: string, childrenWidthOverride: number, showAll: boolean, childLimit_up: number, childLimit_down: number,
			pack: ChildPack, index: number, collection: ChildPack[], direction?: "up" | "down",
		}, {}> {
	static defaultProps = {direction: "down"};
	render() {
		let {map, path, childrenWidthOverride, childLimit_up, childLimit_down, showAll, pack, index, direction} = this.props;
		/*if (pack.node.premiseAddHelper) {
			return <PremiseAddHelper mapID={map._id} parentNode={node} parentPath={path}/>;
		}*#/

		let childLimit = direction == "down" ? childLimit_down : childLimit_up;
		return (
			<NodeUI key={pack.node._id} map={map} node={pack.node}
					path={path + "/" + pack.node._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}>
				{index == (direction == "down" ? childLimit - 1 : 0) && !showAll && (collection.length > childLimit || childLimit != initialChildLimit) &&
					<ChildLimitBar {...{map, path, childrenWidthOverride, childLimit}} direction={direction} childCount={collection.length}/>}
			</NodeUI>
		);
	}
}*/

type Props = {
	map: Map, node: MapNodeL3, path: string, nodeView: MapNodeView, nodeChildrenToShow: MapNodeL3[], type: HolderType,
	separateChildren: boolean, showArgumentsControlBar: boolean, linkSpawnPoint: number, vertical?: boolean, minWidth?: number,
	onHeightOrDividePointChange?: (dividePoint: number)=>void,
};
let initialState = {
	childrenWidthOverride: null as number,
	oldChildBoxOffsets: null as {[key: number]: Vector2i},
};

let connector = (state, {node, path, nodeChildrenToShow}: Props)=> {
	/*let nodeChildren_sortValues = IsSpecialEmptyArray(nodeChildrenToShow) ? emptyObj : nodeChildrenToShow.filter(a=>a).ToMap(child=>child._id+"", child=> {
		return GetRatingAverage_AtPath(child, GetSortByRatingType(child));
	});*/
	let nodeChildren_fillPercents = IsSpecialEmptyArray(nodeChildrenToShow) ? emptyObj : nodeChildrenToShow.filter(a=>a).ToMap(child=>child._id+"", child=> {
		return GetFillPercent_AtPath(child, `${path}/${child._id}`);
	});

	return {
		initialChildLimit: State(a=>a.main.initialChildLimit),
		//nodeChildren_sortValues: CachedTransform("nodeChildren_sortValues_transform1", [node._id], nodeChildren_sortValues, ()=>nodeChildren_sortValues),
		nodeChildren_fillPercents: CachedTransform("nodeChildren_fillPercents_transform1", [node._id], nodeChildren_fillPercents, ()=>nodeChildren_fillPercents),
	};
};
@Connect(connector)
export class NodeChildHolder extends BaseComponentWithConnector(connector, initialState) {
	static defaultProps = {minWidth: 0};
	/*static ValidateProps(props) {
		let {node, path} = props;
		//Assert(SplitStringBySlash_Cached(path).Distinct().length == SplitStringBySlash_Cached(path).length, `Node path contains a circular link! (${path})`);
	}*/
	
	childBoxes: {[key: number]: NodeUI} = {};
	render() {
		let {map, node, nodeView, path, nodeChildrenToShow, type, separateChildren, showArgumentsControlBar, linkSpawnPoint, vertical, minWidth, onHeightOrDividePointChange,
			initialChildLimit, nodeChildren_fillPercents} = this.props;
		let {childrenWidthOverride, oldChildBoxOffsets} = this.state;
		childrenWidthOverride = (childrenWidthOverride|0).KeepAtLeast(minWidth);

		let nodeChildrenToShowHere = nodeChildrenToShow;
		let nodeChildrenToShowInRelevanceBox;
		if (IsMultiPremiseArgument(node) && type != HolderType.Relevance) {
			nodeChildrenToShowHere = nodeChildrenToShow.filter(a=>a && a.type != MapNodeType.Argument);
			nodeChildrenToShowInRelevanceBox = nodeChildrenToShow.filter(a=>a && a.type == MapNodeType.Argument);
		}

		let upChildren = separateChildren ? nodeChildrenToShowHere.filter(a=>a.finalPolarity == Polarity.Supporting) : [];
		let downChildren = separateChildren ? nodeChildrenToShowHere.filter(a=>a.finalPolarity == Polarity.Opposing) : [];
		
		// apply sorting
		if (separateChildren) {
			upChildren = upChildren.OrderBy(child=>nodeChildren_fillPercents[child._id]);
			downChildren = downChildren.OrderByDescending(child=>nodeChildren_fillPercents[child._id]);
		} else {
			nodeChildrenToShowHere = nodeChildrenToShowHere.OrderByDescending(child=>nodeChildren_fillPercents[child._id]);
			//if (IsArgumentNode(node)) {
			let isArgument_any = node.type == MapNodeType.Argument && node.current.argumentType == ArgumentType.Any;
			if (node.childrenOrder && !isArgument_any) {
				nodeChildrenToShowHere = nodeChildrenToShowHere.OrderBy(child=>node.childrenOrder.indexOf(child._id).IfN1Then(Number.MAX_SAFE_INTEGER));
			}
		}

		let childLimit_up = ((nodeView || {}).childLimit_up || initialChildLimit).KeepAtLeast(initialChildLimit);
		let childLimit_down = ((nodeView || {}).childLimit_down || initialChildLimit).KeepAtLeast(initialChildLimit);
		// if the map's root node, or an argument node, show all children
		let showAll = node._id == map.rootNode || node.type == MapNodeType.Argument;
		if (showAll) [childLimit_up, childLimit_down] = [100, 100];

		let RenderChild = (child: MapNodeL3, index: number, collection, direction = "down" as "up" | "down")=> {
			/*if (pack.node.premiseAddHelper) {
				return <PremiseAddHelper mapID={map._id} parentNode={node} parentPath={path}/>;
			}*/

			let childLimit = direction == "down" ? childLimit_down : childLimit_up;
			return (
				<NodeUI key={child._id} ref={c=>this.childBoxes[child._id] = GetInnerComp(c)} map={map} node={child}
						path={path + "/" + child._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}>
					{index == (direction == "down" ? childLimit - 1 : 0) && !showAll && (collection.length > childLimit || childLimit != initialChildLimit) &&
						<ChildLimitBar {...{map, path, childrenWidthOverride, childLimit}} direction={direction} childCount={collection.length}/>}
				</NodeUI>
			);
		}
		
		this.childBoxes = {};
		return (
			<Column ref={c=>this.childHolder = c} className="childHolder clickThrough" style={E(
				{
					marginLeft: vertical ? 20 : (nodeChildrenToShow.length || showArgumentsControlBar) ? 30 : 0,
					//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
				},
				//!expanded && {visibility: "hidden", height: 0}, // maybe temp; fix for lines-sticking-to-top issue
				// if we don't know our child offsets yet, render still (so we can measure ourself), but make self invisible
				oldChildBoxOffsets == null && {opacity: 0, pointerEvents: "none"},
			)}>
				{linkSpawnPoint && oldChildBoxOffsets &&
					//<NodeConnectorBackground node={node} linkSpawnPoint={vertical ? Vector2iCache.Get(0, linkSpawnPoint) : Vector2iCache.Get(-30, linkSpawnPoint)}
					<NodeConnectorBackground node={node} linkSpawnPoint={vertical ? new Vector2i(-10, 0) : new Vector2i(-30, linkSpawnPoint)} straightLines={vertical}
						shouldUpdate={true} //this.lastRender_source == RenderSource.SetState}
						nodeChildren={nodeChildrenToShowHere} childBoxOffsets={oldChildBoxOffsets}/>}
				
				{/* if we're for multi-premise arg, and this comp is not already showing relevance-args, show them in a "Taken together, are these claims relevant?" box */}
				{IsMultiPremiseArgument(node) && type != HolderType.Relevance &&
					<NodeChildHolderBox {...{map, node, path, nodeView}} type={HolderType.Relevance} widthOverride={childrenWidthOverride}
						widthOfNode={childrenWidthOverride}
						nodeChildren={GetNodeChildrenL3(node, path)} nodeChildrenToShow={nodeChildrenToShowInRelevanceBox}
						onHeightOrDividePointChange={dividePoint=>this.CheckForChanges()}/>}
				{!separateChildren && nodeChildrenToShowHere.slice(0, childLimit_down).map((pack, index)=> {
					return RenderChild(pack, index, nodeChildrenToShowHere);
				})}
				{separateChildren &&
					<Column ref={c=>this.upChildHolder = c} ct className="upChildHolder">
						{upChildren.slice(-childLimit_up).map((child, index)=> {
							return RenderChild(child, index, upChildren, "up");
						})}
					</Column>}
				{showArgumentsControlBar &&
					<ArgumentsControlBar ref={c=>this.argumentsControlBar = c} map={map} parentNode={node} parentPath={path} node={node}/>}
				{separateChildren &&
					<Column ref={c=>this.downChildHolder = c} ct>
						{downChildren.slice(0, childLimit_down).map((child, index)=> {
							return RenderChild(child, index, downChildren, "down");
						})}
					</Column>}
			</Column>
		);
	}
	childHolder: Column;
	upChildHolder: Column;
	downChildHolder: Column;
	argumentsControlBar: ArgumentsControlBar;

	get Expanded() {
		let {type, nodeView} = this.props;
		let expandKey = type ? `expanded_${HolderType[type].toLowerCase()}` : "expanded";
		return nodeView[expandKey];
	}

	get ChildOrderStr() {
		let {nodeChildrenToShow, nodeChildren_fillPercents} = this.props;
		return nodeChildrenToShow.OrderBy(a=>nodeChildren_fillPercents[a._id]).map(a=>a._id).join(",");
	}

	PostRender() {
		this.CheckForChanges();
	}

	lastHeight = 0;
	lastDividePoint = 0;
	lastOrderStr = null;
	CheckForChanges() {
		//if (this.lastRender_source == RenderSource.SetState) return;
		let {node, onHeightOrDividePointChange} = this.props;

		let height = $(GetDOM(this)).outerHeight();
		let dividePoint = this.GetDividePoint();
		if (height != this.lastHeight || dividePoint != this.lastDividePoint) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
				()=>`OnHeightChange NodeChildHolder (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
					}dividePoint:${dividePoint}`);
			
			//this.UpdateState(true);
			this.UpdateChildrenWidthOverride();
			this.UpdateChildBoxOffsets();
			if (onHeightOrDividePointChange) onHeightOrDividePointChange(dividePoint);
		}
		this.lastHeight = height;
		this.lastDividePoint = dividePoint;

		let orderStr = this.ChildOrderStr;
		if (orderStr != this.lastOrderStr) {
			//this.OnChildHeightOrPosOrOrderChange();
			//this.UpdateChildrenWidthOverride();
			this.UpdateChildBoxOffsets();
			//this.ReportDividePointChange();
		}
		this.lastOrderStr = orderStr;
	}

	OnChildHeightOrPosChange_updateStateQueued = false;
	OnChildHeightOrPosChange() {
		let {node} = this.props;
		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
			()=>`OnChildHeightOrPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}\ncenterY:${this.GetDividePoint()}`)

		//this.OnHeightOrPosChange();
		// wait one frame, so that if multiple calls to this method occur in the same frame, we only have to call OnHeightOrPosChange() once
		if (!this.OnChildHeightOrPosChange_updateStateQueued) {
			this.OnChildHeightOrPosChange_updateStateQueued = true;
			requestAnimationFrame(()=> {
				this.OnChildHeightOrPosChange_updateStateQueued = false;
				if (!this.mounted) return;
				/*this.UpdateChildrenWidthOverride();
				this.UpdateChildBoxOffsets();*/
				this.CheckForChanges();
			});
		}
	}

	GetDividePoint() {
		if (this.argumentsControlBar) {
			//return upChildHolder.css("display") != "none" ? upChildHolder.outerHeight() : 0;
			return this.childHolder && (this.childHolder.DOM as HTMLElement).style.visibility != "hidden"
				? $(this.argumentsControlBar.DOM).GetScreenRect().Center.y + 1 - $(this.childHolder.DOM).GetScreenRect().y
				: 0
		}
		//return childHolder.css("display") != "none" ? childHolder.outerHeight() / 2 : 0,
		return this.childHolder && (this.childHolder.DOM as HTMLElement).style.visibility != "hidden" ? $(this.childHolder.DOM).GetScreenRect().height / 2 : 0;
	}

	UpdateChildrenWidthOverride(forceUpdate = false) {
		let {map, node, path, children, nodeView, linkSpawnPoint} = this.props;
		if (!this.Expanded) return;
		
		let childBoxes = this.childBoxes.VValues().filter(a=>a != null);
		
		let cancelIfStateSame = !forceUpdate;
		var changedState = this.SetState({
			childrenWidthOverride: childBoxes.map(comp=>comp.GetMeasurementInfo().width).concat(0).Max(null, true)
		}, null, cancelIfStateSame, true);
		//Log(`Changed state? (${this.props.node._id}): ` + changedState);
	}
	UpdateChildBoxOffsets(forceUpdate = false) {
		let {map, node, path, children, nodeView, linkSpawnPoint} = this.props;
		let childHolder = $(this);
		let upChildHolder = childHolder.children(".upChildHolder");
		let downChildHolder = childHolder.children(".downChildHolder");
		let argumentsControlBar = childHolder.children(".argumentsControlBar");

		let childBoxes = this.childBoxes.VValues().filter(a=>a != null);
		let newState = {} as any;

		let showAddArgumentButtons = false; //node.type == MapNodeType.Claim && expanded && nodeChildren != emptyArray_forLoading; // && nodeChildren.length > 0;
		//if (this.lastRender_source == RenderSource.SetState && this.refs.childHolder) {
		if (this.Expanded && this.childHolder) {
			let holderOffset = new Vector2i($(GetDOM(this.childHolder)).offset());

			let oldChildBoxOffsets = this.childBoxes.Props().filter(pair=>pair.value != null).ToMap(pair=>pair.name, pair=> {
				//let childBox = FindDOM_(pair.value).find("> div:first-child > div"); // get inner-box of child
				//let childBox = $(GetDOM(pair.value)).find(".NodeUI_Inner").first(); // get inner-box of child
				// not sure why this is needed... (bad sign!)
				if (pair.value.NodeUIForDisplayedNode.innerUI == null) return new Vector2i(0, 0);
				
				let childBox = $(pair.value.NodeUIForDisplayedNode.innerUI.DOM);
				Assert(childBox.length, "Could not find inner-ui of child-box.");
				let childBoxOffset = new Vector2i(childBox.offset()).Minus(holderOffset);
				Assert(childBoxOffset.x < 100, "Something is wrong. X-offset should never be more than 100.");
				childBoxOffset = childBoxOffset.Plus(new Vector2i(0, childBox.outerHeight() / 2));
				return childBoxOffset;
			});
			newState.oldChildBoxOffsets = oldChildBoxOffsets;
		}
		
		let cancelIfStateSame = !forceUpdate;
		var changedState = this.SetState(newState, null, cancelIfStateSame, true);
		//Log(`Changed state? (${this.props.node._id}): ` + changedState);
	}
}

let ChildLimitBar_connector = (state, props: {map: Map, path: string, childrenWidthOverride: number, direction: "up" | "down", childCount: number, childLimit: number})=> ({
	initialChildLimit: State(a=>a.main.initialChildLimit),
});
@Connect(ChildLimitBar_connector)
export class ChildLimitBar extends BaseComponentWithConnector(ChildLimitBar_connector, {}) {
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