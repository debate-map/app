import {Assert, emptyObj, nl, ToJSON, Vector2, VRect, WaitXThenRun, E, IsSpecialEmptyArray} from "web-vcore/nm/js-vextensions.js";
import * as React from "react";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "web-vcore/nm/react-beautiful-dnd.js";
import {Button, Column, Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, BaseComponentWithConnector, GetDOM, RenderSource, UseEffect, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {ChildBoxInfo, ChildConnectorBackground} from "UI/@Shared/Maps/MapNode/ChildConnectorBackground.js";
import {NodeUI} from "UI/@Shared/Maps/MapNode/NodeUI.js";
import {ES, GetViewportRect, Icon, MaybeLog, Observer, RunInAction, WaitXThenRun_Deduped} from "web-vcore";
import {DroppableInfo} from "Utils/UI/DNDStructures.js";
import {store} from "Store";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {MapNodeL3, Polarity, ChildGroup, GetNodeChildrenL3, GetOrderingScores_AtPath, IsMultiPremiseArgument, MapNodeType, MapNodeType_Info, ArgumentType, Map} from "dm_common";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import chroma from "web-vcore/nm/chroma-js.js";
import {NodeChildHolderBox} from "./NodeChildHolderBox.js";
import {ArgumentsControlBar} from "../ArgumentsControlBar.js";
import {NodeUI_Inner} from "../NodeUI_Inner.js";

type Props = {
	map: Map, node: MapNodeL3, path: string, nodeChildrenToShow: MapNodeL3[], group: ChildGroup, usesGenericExpandedField: boolean,
	separateChildren: boolean, showArgumentsControlBar: boolean, linkSpawnPoint: number, belowNodeUI?: boolean, minWidth?: number,
	onHeightOrDividePointChange?: (dividePoint: number)=>void,
};
const initialState = {
	childrenWidthOverride: null as number|n,
	lastChildBoxOffsets: null as {[key: number]: Vector2}|n,
	placeholderRect: null as VRect|n,
};

@WarnOfTransientObjectProps
@Observer
export class NodeChildHolder extends BaseComponentPlus({minWidth: 0} as Props, initialState, {} as {nodeChildren_orderingScores: {[key: string]: number}}) {
	/* static ValidateProps(props) {
		let {node, path} = props;
		//Assert(SplitStringBySlash_Cached(path).Distinct().length == SplitStringBySlash_Cached(path).length, `Node path contains a circular link! (${path})`);
	} */

	childBoxes: {[key: number]: NodeUI} = {};
	//childInnerUIs: {[key: number]: NodeUI_Inner} = {};
	render() {
		const {map, node, path, nodeChildrenToShow, group, separateChildren, showArgumentsControlBar, linkSpawnPoint, belowNodeUI, minWidth, onHeightOrDividePointChange} = this.props;
		let {childrenWidthOverride, lastChildBoxOffsets, placeholderRect} = this.state;
		childrenWidthOverride = (childrenWidthOverride ?? 0).KeepAtLeast(minWidth ?? 0);

		const nodeView = GetNodeView(map.id, path);
		const nodeChildren_orderingScores = IsSpecialEmptyArray(nodeChildrenToShow) ? emptyObj : nodeChildrenToShow.filter(a=>a).ToMapObj(child=>`${child.id}`, child=>{
			return GetOrderingScores_AtPath(child, `${path}/${child.id}`);
		});
		this.Stash({nodeChildren_orderingScores});

		const {initialChildLimit} = store.main.maps;
		const {currentNodeBeingAdded_path} = store.main.maps;

		let nodeChildrenToShowHere = nodeChildrenToShow;
		//let nodeChildrenToShowInRelevanceBox;
		if (IsMultiPremiseArgument(node) && group != ChildGroup.relevance) {
			nodeChildrenToShowHere = nodeChildrenToShow.filter(a=>a && a.type != MapNodeType.argument);
			//nodeChildrenToShowInRelevanceBox = nodeChildrenToShow.filter(a=>a && a.type == MapNodeType.argument);
		}

		let upChildren = separateChildren ? nodeChildrenToShowHere.filter(a=>a.displayPolarity == Polarity.supporting) : [];
		let downChildren = separateChildren ? nodeChildrenToShowHere.filter(a=>a.displayPolarity == Polarity.opposing) : [];

		// apply sorting (regardless of direction, both are ordered by score/priority; "up" reordering is applied on the *child-ui list*, not the child-node list)
		if (separateChildren) {
			upChildren = upChildren.OrderByDescending(child=>nodeChildren_orderingScores[child.id]);
			downChildren = downChildren.OrderByDescending(child=>nodeChildren_orderingScores[child.id]);
			// this is really not recommended, but I guess there could be use-cases (only admins are allowed to manually order this type anyway)
			/*if (node.childrenOrder) {
				upChildren = upChildren.OrderByDescending(child=>node.childrenOrder.indexOf(child.id).IfN1Then(Number.MAX_SAFE_INTEGER)); // descending, since index0 of upChildren group shows at bottom
				downChildren = downChildren.OrderBy(child=>node.childrenOrder.indexOf(child.id).IfN1Then(Number.MAX_SAFE_INTEGER));
			}*/
		} else {
			nodeChildrenToShowHere = nodeChildrenToShowHere.OrderByDescending(child=>nodeChildren_orderingScores[child.id]);
			// if (IsArgumentNode(node)) {
			//const isArgument_any = node.type == MapNodeType.argument && node.current.argumentType == ArgumentType.any;
			/*if (node.childrenOrder) {
				nodeChildrenToShowHere = nodeChildrenToShowHere.OrderBy(child=>node.childrenOrder.indexOf(child.id).IfN1Then(Number.MAX_SAFE_INTEGER));
			}*/
		}

		let childLimit_up = ((nodeView || {}).childLimit_up || initialChildLimit).KeepAtLeast(initialChildLimit);
		let childLimit_down = ((nodeView || {}).childLimit_down || initialChildLimit).KeepAtLeast(initialChildLimit);
		// if the map's root node, or an argument node, show all children
		const showAll = node.id == map.rootNode || node.type == MapNodeType.argument;
		if (showAll) [childLimit_up, childLimit_down] = [100, 100];

		const RenderChild = (child: MapNodeL3, index: number, collection_untrimmed: MapNodeL3[], direction = "down" as "up" | "down")=>{
			/*if (pack.node.premiseAddHelper) {
				return <PremiseAddHelper mapID={map._id} parentNode={node} parentPath={path}/>;
			}*/

			const childLimit = direction == "down" ? childLimit_down : childLimit_up;
			const isFarthestChildFromDivider = index == (direction == "down" ? childLimit - 1 : 0);
			//const isFarthestChildFromDivider = index == childLimit - 1;
			const showLimitBar = isFarthestChildFromDivider && !showAll && (collection_untrimmed.length > childLimit || childLimit != initialChildLimit);

			const nodeUI = <NodeUI key={child.id}
				ref={c=>this.childBoxes[child.id] = c}
				ref_innerUI={c=>WaitXThenRun_Deduped(this, "UpdateChildBoxOffsets", 0, ()=>this.UpdateChildBoxOffsets())}
				indexInNodeList={index} map={map} node={child}
				path={`${path}/${child.id}`}
				leftMarginForLines={belowNodeUI ? 20 : 0}
				widthOverride={childrenWidthOverride}
				onHeightOrPosChange={this.OnChildHeightOrPosChange}/>;
			const limitBar = <ChildLimitBar {...{map, path, childrenWidthOverride, childLimit}} direction={direction} childCount={collection_untrimmed.length}/>;

			if (showLimitBar) {
				return (
					<React.Fragment key={child.id}>
						{direction == "up" && limitBar}
						{nodeUI}
						{direction == "down" && limitBar}
					</React.Fragment>
				);
			}
			return nodeUI;
		};

		const RenderPolarityGroup = (polarityGroup: "all" | "up" | "down")=>{
			const direction = polarityGroup == "up" ? "up" : "down";
			const refName = `${polarityGroup}ChildHolder`;
			const childLimit = polarityGroup == "up" ? childLimit_up : childLimit_down; // "all" and "down" share a child-limit

			const childrenHere_untrimmed = polarityGroup == "all" ? nodeChildrenToShowHere : polarityGroup == "up" ? upChildren : downChildren;
			const childrenHere = childrenHere_untrimmed.slice(0, childLimit); // trim to the X most significant children (ie. strongest arguments)
			// if direction is up, we need to have the first-in-children-array/highest-fill-percent entries show at the *bottom*, so reverse the children-here array
			if (direction == "up") childrenHere.reverse();

			const childrenHereUIs = childrenHere.map((pack, index)=>{
				return RenderChild(pack, index, childrenHere_untrimmed, direction);
			});
			// if direction is up, we need to have the first-in-children-array/highest-fill-percent entries show at the *bottom*, so reverse the children-uis array
			// if (direction == 'up') childrenHereUIs.reverse();

			const dragBox = document.querySelector(".NodeUI_Inner.DragPreview");
			const dragBoxRect = dragBox && VRect.FromLTWH(dragBox.getBoundingClientRect());

			return (
				<Droppable type="MapNode" droppableId={ToJSON(droppableInfo.VSet({subtype: polarityGroup, childIDs: childrenHere.map(a=>a.id)}))} /* renderClone={(provided, snapshot, descriptor) => {
					const index = descriptor.index;
					const pack = childrenHere.slice(0, childLimit)[index];
					return RenderChild(pack, index, childrenHere);
				}} */>
					{(provided: DroppableProvided, snapshot: DroppableStateSnapshot)=>{
						const dragIsOverDropArea = provided.placeholder?.props["on"] != null;
						if (dragIsOverDropArea) {
							WaitXThenRun(0, ()=>this.StartGeneratingPositionedPlaceholder(polarityGroup));
						}

						return (
							<Column ref={c=>{ this[`${polarityGroup}ChildHolder`] = c; provided.innerRef(GetDOM(c) as any); }} ct className={refName} {...provided.droppableProps}
								style={E(
									{position: "relative"},
									childrenHere.length == 0 && {position: "absolute", top: polarityGroup == "down" ? "100%" : 0, width: MapNodeType_Info.for[MapNodeType.claim].minWidth, height: 100},
								)}>
								{/* childrenHere.length == 0 && <div style={{ position: 'absolute', top: '100%', width: '100%', height: 200 }}/> */}
								{childrenHereUIs}
								{provided.placeholder}
								{dragIsOverDropArea && placeholderRect &&
									<div style={{
										position: "absolute", left: 0 /* placeholderRect.x */, top: placeholderRect.y, width: childrenWidthOverride || placeholderRect.width, height: placeholderRect.height,
										border: "1px dashed rgba(255,255,255,1)", borderRadius: 5,
									}}/>}
							</Column>
						);
					}}
				</Droppable>
			);
		};

		const childBoxInfos = [] as ChildBoxInfo[];
		for (const [nodeID, offset] of Object.entries(lastChildBoxOffsets ?? {})) {
			const node = nodeChildrenToShowHere.find(a=>a.id == nodeID);
			childBoxInfos.push({
				node,
				offset,
				color: node ? GetNodeColor(node, "raw", false) : chroma("rgba(0,0,0,0)"),
			});
		}

		const droppableInfo = new DroppableInfo({type: "NodeChildHolder", parentPath: path, childGroup: group});
		//this.childBoxes = {};
		// only clear this.childBoxes when first mounting // actually, no need to clear; the ref-funcs already clear their own entries
		/*UseEffect(()=>{
			this.childBoxes = {};
			//this.childInnerUIs = {};
		}, []);*/
		return (
			<Column ref={c=>this.childHolder = c} className="NodeChildHolder clickThrough" style={E(
				{
					position: "relative", // needed so position:absolute in RenderGroup takes into account NodeUI padding
					// marginLeft: vertical ? 20 : (nodeChildrenToShow.length || showArgumentsControlBar) ? 30 : 0,
					marginLeft: belowNodeUI ? 20 : 30,
					// display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
				},
				belowNodeUI && {marginTop: -5, paddingTop: 5}, // fixes gap that was present
				//! expanded && {visibility: "hidden", height: 0}, // maybe temp; fix for lines-sticking-to-top issue
				// if we don't know our child offsets yet, render still (so we can measure ourself), but make self invisible
				lastChildBoxOffsets == null && {opacity: 0, pointerEvents: "none"},
			)}>
				{(linkSpawnPoint > 0 || belowNodeUI) && lastChildBoxOffsets &&
					// <NodeConnectorBackground node={node} linkSpawnPoint={vertical ? Vector2Cache.Get(0, linkSpawnPoint) : Vector2Cache.Get(-30, linkSpawnPoint)}
					<ChildConnectorBackground node={node} path={path} linkSpawnPoint={new Vector2(belowNodeUI ? -10 : -30, linkSpawnPoint)} straightLines={belowNodeUI}
						shouldUpdate={true} // this.lastRender_source == RenderSource.SetState}
						childBoxInfos={childBoxInfos}/>}

				{/* if we're for multi-premise arg, and this comp is not already showing relevance-args, show them in a "Taken together, are these claims relevant?" box */}
				{/*IsMultiPremiseArgument(node) && group != ChildGroup.relevance &&
					<NodeChildHolderBox {...{map, node, path}} group={ChildGroup.relevance} widthOverride={childrenWidthOverride}
						widthOfNode={childrenWidthOverride}
						nodeChildren={GetNodeChildrenL3(node.id, path)} nodeChildrenToShow={nodeChildrenToShowInRelevanceBox}
						onHeightOrDividePointChange={dividePoint=>this.CheckForLocalChanges()}/>*/}
				{!separateChildren &&
					RenderPolarityGroup("all")}
				{separateChildren &&
					RenderPolarityGroup("up")}
				{showArgumentsControlBar &&
					<ArgumentsControlBar ref={c=>this.argumentsControlBar = c} map={map} node={node} path={path} group={group} childBeingAdded={currentNodeBeingAdded_path == `${path}/?`}/>}
				{separateChildren &&
					RenderPolarityGroup("down")}
			</Column>
		);
	}
	childHolder: Column|n;
	allChildHolder: Column|n;
	upChildHolder: Column|n;
	downChildHolder: Column|n;
	argumentsControlBar: ArgumentsControlBar|n;

	StartGeneratingPositionedPlaceholder(group: "all" | "up" | "down") {
		const groups = {all: this.allChildHolder, up: this.upChildHolder, down: this.downChildHolder};
		const childHolder = groups[group];
		if (childHolder == null || !childHolder.mounted) {
			// call again in a second, once child-holder is initialized
			WaitXThenRun(0, ()=>this.StartGeneratingPositionedPlaceholder(group));
			return;
		}

		const childHolderRect = VRect.FromLTWH(childHolder.DOM!.getBoundingClientRect());
		/* const match = firstOffsetInner.style.transform.match(/([0-9]+).+?([0-9]+)/);
		const dragBoxSize = new Vector2(match[1].ToInt(), match[2].ToInt());
		// delete dragInfo.provided.draggableProps.style.transform; */
		const dragBox = document.querySelector(".NodeUI_Inner.DragPreview");
		if (dragBox == null) return; // this can happen at end of drag
		const dragBoxRect = VRect.FromLTWH(dragBox.getBoundingClientRect());

		const siblingNodeUIs = (Array.from(childHolder.DOM!.childNodes) as HTMLElement[]).filter(a=>a.classList.contains("NodeUI"));
		const siblingNodeUIInnerDOMs = siblingNodeUIs.map(nodeUI=>nodeUI.QuerySelector_BreadthFirst(".NodeUI_Inner")).filter(a=>a != null) as HTMLElement[]; // entry can be null if inner-ui still loading
		const firstOffsetInner = siblingNodeUIInnerDOMs.find(a=>a && a.style.transform && a.style.transform.includes("translate("));

		let placeholderRect: VRect;
		if (firstOffsetInner) {
			const firstOffsetInnerRect = VRect.FromLTWH(firstOffsetInner.getBoundingClientRect()).NewTop(top=>top - dragBoxRect.height);
			const firstOffsetInnerRect_relative = new VRect(firstOffsetInnerRect.Position.Minus(childHolderRect.Position), firstOffsetInnerRect.Size);

			placeholderRect = firstOffsetInnerRect_relative.NewWidth(dragBoxRect.width).NewHeight(dragBoxRect.height);
		} else {
			if (siblingNodeUIInnerDOMs.length) {
				const lastInner = siblingNodeUIInnerDOMs.Last();
				const lastInnerRect = VRect.FromLTWH(lastInner.getBoundingClientRect()).NewTop(top=>top - dragBoxRect.height);
				const lastInnerRect_relative = new VRect(lastInnerRect.Position.Minus(childHolderRect.Position), lastInnerRect.Size);

				placeholderRect = lastInnerRect_relative.NewWidth(dragBoxRect.width).NewHeight(dragBoxRect.height);
				// if (dragBoxRect.Center.y > firstOffsetInnerRect.Center.y) {
				placeholderRect.y += lastInnerRect.height;
			} else {
				placeholderRect = new VRect(Vector2.zero, dragBoxRect.Size);
			}
		}

		this.SetState({placeholderRect});
	}

	get Expanded() {
		const {map, path, group, usesGenericExpandedField} = this.props;
		const expandKey = usesGenericExpandedField ? "expanded" : `expanded_${ChildGroup[group].toLowerCase()}`;
		const nodeView = GetNodeView(map.id, path);
		return nodeView[expandKey];
	}

	get ChildOrderStr() {
		const {nodeChildrenToShow, nodeChildren_orderingScores: nodeChildren_fillPercents} = this.PropsStash;
		return nodeChildrenToShow.OrderBy(a=>nodeChildren_fillPercents?.[a.id] ?? 0).map(a=>a.id).join(",");
	}

	PostRender() {
		this.CheckForLocalChanges();
	}

	lastHeight = 0;
	lastDividePoint = 0;
	lastOrderStr = null as string|n;
	// Checks for at-our-level state that may require us to update our width or child-box-offsets (for positioning our lines to child nodes).
	// Note that there are other pathways by which our width/child-box-offsets may be updated. (eg. if child box repositions, an update is triggered through OnChildHeightOrPosChange)
	CheckForLocalChanges() {
		// if (this.lastRender_source == RenderSource.SetState) return;
		const {node, onHeightOrDividePointChange} = this.props;

		//const height = GetDOM(this)!.getBoundingClientRect().height;
		const height = this.DOM_HTML.offsetHeight;
		const dividePoint = this.GetDividePoint();
		if (height != this.lastHeight || dividePoint != this.lastDividePoint) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
				()=>`OnHeightChange NodeChildHolder (${RenderSource[this.lastRender_source]}):${this.props.node.id}${nl}dividePoint:${dividePoint}`);

			// this.UpdateState(true);
			this.UpdateChildrenWidthOverride();
			this.UpdateChildBoxOffsets();
			if (onHeightOrDividePointChange) onHeightOrDividePointChange(dividePoint);
		}
		this.lastHeight = height;
		this.lastDividePoint = dividePoint;

		const orderStr = this.ChildOrderStr;
		if (orderStr != this.lastOrderStr) {
			// this.OnChildHeightOrPosOrOrderChange();
			// this.UpdateChildrenWidthOverride();
			this.UpdateChildBoxOffsets();
			// this.ReportDividePointChange();
		}
		this.lastOrderStr = orderStr;
	}

	OnChildHeightOrPosChange = ()=>{
		const {node} = this.props;
		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
			()=>`OnChildHeightOrPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node.id}\ncenterY:${this.GetDividePoint()}`);

		// this.OnHeightOrPosChange();
		WaitXThenRun_Deduped(this, "OnChildHeightOrPosChange_lastPart", 0, ()=>{
			if (!this.mounted) return;
			this.UpdateChildrenWidthOverride();
			this.UpdateChildBoxOffsets();
			this.CheckForLocalChanges();
		});
	};

	GetDividePoint() {
		if (this.argumentsControlBar) {
			// return upChildHolder.css("display") != "none" ? upChildHolder.outerHeight() : 0;
			return this.childHolder && (this.childHolder.DOM as HTMLElement).style.visibility != "hidden"
				? GetViewportRect(this.argumentsControlBar.DOM!).Center.y + 1 - GetViewportRect(this.childHolder.DOM!).y
				: 0;
		}
		// return childHolder.css("display") != "none" ? childHolder.outerHeight() / 2 : 0,
		return this.childHolder && (this.childHolder.DOM as HTMLElement).style.visibility != "hidden" ? GetViewportRect(this.childHolder.DOM!).height / 2 : 0;
	}

	UpdateChildrenWidthOverride(forceUpdate = false) {
		if (!this.Expanded) return;

		const childBoxes = this.childBoxes.VValues().filter(a=>a != null);

		const cancelIfStateSame = !forceUpdate;
		const changedState = this.SetState({
			childrenWidthOverride: childBoxes.map(comp=>comp.GetMeasurementInfo().width).concat(0).Max(undefined, true),
		}, undefined, cancelIfStateSame, true);
		// Log(`Changed state? (${this.props.node._id}): ` + changedState);
	}
	UpdateChildBoxOffsets(forceUpdate = false) {
		//const childBoxes = this.childBoxes.VValues().filter(a=>a != null);
		const newState = {} as any;

		const showAddArgumentButtons = false; // node.type == MapNodeType.claim && expanded && nodeChildren != emptyArray_forLoading; // && nodeChildren.length > 0;
		// if (this.lastRender_source == RenderSource.SetState && this.childHolder) {
		if (this.Expanded && this.childHolder) {
			const holderRect = VRect.FromLTWH(this.childHolder.DOM!.getBoundingClientRect());

			const lastChildBoxOffsets = this.childBoxes.Pairs().ToMapObj(pair=>pair.key, pair=>{
			//const lastChildBoxOffsets = this.childInnerUIs.Pairs().filter(pair=>pair.value != null).ToMapObj(pair=>pair.key, pair=>{
				const childBox = pair.value?.NodeUIForDisplayedNode.innerUI?.DOM;
				if (childBox == null) return null; // can be null in certain cases (eg. while inner-ui still data-loading)

				// Assert(childBox.length, 'Could not find inner-ui of child-box.');
				if (childBox == null) return null; // if can't find child-node's box, don't draw line for it (can happen if dragging child-node)
				if (childBox.matches(".DragPreview")) return null; // don't draw line to node-box being dragged

				let childBoxOffset = VRect.FromLTWH(childBox.getBoundingClientRect()).Position.Minus(holderRect.Position);
				Assert(childBoxOffset.x < 100, "Something is wrong. X-offset should never be more than 100.");
				childBoxOffset = childBoxOffset.Plus(new Vector2(0, childBox.getBoundingClientRect().height / 2));
				return childBoxOffset;
			});
			newState.lastChildBoxOffsets = lastChildBoxOffsets;
		}

		const cancelIfStateSame = !forceUpdate;
		const changedState = this.SetState(newState, undefined, cancelIfStateSame, true);
		// Log(`Changed state? (${this.props.node._id}): ` + changedState);
	}
}

export class ChildLimitBar extends BaseComponentPlus({} as {map: Map, path: string, childrenWidthOverride: number|n, direction: "up" | "down", childCount: number, childLimit: number}, {}) {
	static HEIGHT = 36;
	render() {
		const {map, path, childrenWidthOverride, direction, childCount, childLimit} = this.props;
		const nodeView = GetNodeView(map.id, path);
		const {initialChildLimit} = store.main.maps;
		return (
			<Row style={{
				// position: "absolute", marginTop: -30,
				//[direction == "up" ? "marginBottom" : "marginTop"]: 10,
				margin: "5px 0",
				width: childrenWidthOverride, cursor: "default",
			}}>
				<Button text={
					<Row>
						<Icon icon={`arrow-${direction}`} size={15}/>
						<Div ml={3}>{childCount > childLimit ? childCount - childLimit : null}</Div>
					</Row>
				} title="Show more"
				enabled={childLimit < childCount} style={ES({flex: 1})} onClick={()=>{
					RunInAction("ChildLimitBar.showMore.onClick", ()=>{
						nodeView[`childLimit_${direction}`] = (childLimit + 3).KeepAtMost(childCount);
					});
				}}/>
				<Button ml={5} text={
					<Row>
						<Icon icon={`arrow-${direction == "up" ? "down" : "up"}`} size={15}/>
						{/* <Div ml={3}>{childCount > childLimit ? childCount - childLimit : null}</Div> */}
					</Row>
				} title="Show less"
				enabled={childLimit > initialChildLimit} style={ES({flex: 1})} onClick={()=>{
					RunInAction("ChildLimitBar.showLess.onClick", ()=>{
						nodeView[`childLimit_${direction}`] = (childLimit - 3).KeepAtLeast(initialChildLimit);
					});
				}}/>
			</Row>
		);
	}
}