import {ChildGroup, GetOrderingScores_AtPath, IsMultiPremiseArgument, Map, MapNodeL3, MapNodeType, MapNodeType_Info, Polarity} from "dm_common";
import * as React from "react";
import {useCallback} from "react";
import {store} from "Store";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {StripesCSS} from "tree-grapher";
import {NodeUI} from "UI/@Shared/Maps/MapNode/NodeUI.js";
import {DroppableInfo} from "Utils/UI/DNDStructures.js";
import {TreeGraphDebug} from "Utils/UI/General.js";
import {GetViewportRect, MaybeLog, Observer, WaitXThenRun_Deduped} from "web-vcore";
import {E, emptyObj, IsSpecialEmptyArray, nl, ToJSON, Vector2, VRect, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "web-vcore/nm/react-beautiful-dnd.js";
import {Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM, RenderSource, UseCallback, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {ArgumentsControlBar} from "../ArgumentsControlBar.js";
import {ChildLimitBar} from "./ChildLimitBar.js";

type Props = {
	map: Map, node: MapNodeL3, path: string, treePath: string, treePath_priorChildCount?: number, nodeChildrenToShow: MapNodeL3[], group: ChildGroup, usesGenericExpandedField: boolean,
	separateChildren: boolean, showArgumentsControlBar: boolean, belowNodeUI?: boolean, minWidth?: number,
	onSizesChange?: (aboveSize: number, belowSize: number)=>void,
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
		const {map, node, path, treePath, treePath_priorChildCount, nodeChildrenToShow, group, separateChildren, showArgumentsControlBar, belowNodeUI, minWidth} = this.props;
		let {childrenWidthOverride, placeholderRect} = this.state;
		childrenWidthOverride = childrenWidthOverride ? childrenWidthOverride.KeepAtLeast(minWidth ?? 0) : null;

		const nodeView = GetNodeView(map.id, path);
		const nodeChildren_orderingScores = IsSpecialEmptyArray(nodeChildrenToShow) ? emptyObj : nodeChildrenToShow.filter(a=>a).ToMapObj(child=>`${child.id}`, child=>{
			return GetOrderingScores_AtPath(child, `${path}/${child.id}`);
		});
		this.Stash({nodeChildren_orderingScores});

		const {initialChildLimit} = store.main.maps;
		const {currentNodeBeingAdded_path} = store.main.maps;

		let nodeChildrenToShowHere = nodeChildrenToShow;
		//let nodeChildrenToShowInRelevanceBox;
		if (IsMultiPremiseArgument(node) && group == ChildGroup.generic) {
			nodeChildrenToShowHere = nodeChildrenToShow.filter(a=>a.type == MapNodeType.claim);
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

		let childLimit_up = (nodeView?.childLimit_up || initialChildLimit).KeepAtLeast(initialChildLimit);
		let childLimit_down = (nodeView?.childLimit_down || initialChildLimit).KeepAtLeast(initialChildLimit);
		// if the map's root node, or an argument node, show all children
		const showAll = node.id == map.rootNode || node.type == MapNodeType.argument;
		if (showAll) [childLimit_up, childLimit_down] = [100, 100];

		// helper
		/*const renderedChildrenOrder = [] as string[];
		// once we're done rendering, store the rendered-children-order in the node-view, eg. so child NodeUI's can whether they have any expanded siblings
		setTimeout(()=>{
			if (nodeView.renderedChildrenOrder?.join(";") != renderedChildrenOrder.join(";")) {
				RunInAction("NodeChildHolder.render.updateRenderedChildrenOrder", ()=>nodeView.renderedChildrenOrder = renderedChildrenOrder);
			}
		}, 0);*/

		let nextChildFullIndex = treePath_priorChildCount ?? 0;
		const RenderPolarityGroup = (polarityGroup: "all" | "up" | "down")=>{
			const direction = polarityGroup == "up" ? "up" : "down";
			const childLimit = direction == "up" ? childLimit_up : childLimit_down; // polarity-groups "all" and "down" both use a "down" child-limit
			const refName = `${polarityGroup}ChildHolder`;

			const childrenHere_untrimmed = polarityGroup == "all" ? nodeChildrenToShowHere : polarityGroup == "up" ? upChildren : downChildren;
			const childrenHere = childrenHere_untrimmed.slice(0, childLimit); // trim to the X most significant children (ie. strongest arguments)
			// if direction is up, we need to have the first-in-children-array/highest-fill-percent entries show at the *bottom*, so reverse the children-here array
			if (direction == "up") childrenHere.reverse();

			const childrenHereUIs = childrenHere.map((child, index)=>{
				const parent = this;
				const collection_untrimmed = childrenHere_untrimmed;
				const widthOverride = childrenWidthOverride;

				/*if (pack.node.premiseAddHelper) {
					return <PremiseAddHelper mapID={map._id} parentNode={node} parentPath={path}/>;
				}*/

				const isFarthestChildFromDivider = index == (direction == "down" ? childLimit - 1 : 0);
				//const isFarthestChildFromDivider = index == childLimit - 1;
				const showLimitBar = isFarthestChildFromDivider && !showAll && (collection_untrimmed.length > childLimit || childLimit != initialChildLimit);

				// wrap these in funcs, so the execution-orders always match the display-orders (so that tree-path is correct)
				const getLimitBar = ()=>{
					return <ChildLimitBar {...{
						map, path, treePath: `${treePath}/${nextChildFullIndex++}`,
						inBelowGroup: belowNodeUI ?? false,
						childrenWidthOverride: widthOverride, direction, childLimit,
						childCount: collection_untrimmed.length,
					}}/>;
				};
				const getNodeUI = ()=>{
					return <NodeUI key={child.id}
						ref={UseCallback(c=>parent.childBoxes[child.id] = c, [child.id, parent.childBoxes])} // eslint-disable-line
						//ref_innerUI={UseCallback(c=>WaitXThenRun_Deduped(parent, "UpdateChildBoxOffsets", 0, ()=>parent.UpdateChildBoxOffsets()), [parent])}
						indexInNodeList={index} map={map} node={child}
						path={`${path}/${child.id}`}
						treePath={`${treePath}/${nextChildFullIndex++}`}
						inBelowGroup={belowNodeUI}
						widthOverride={widthOverride}
						onHeightOrPosChange={parent.OnChildHeightOrPosChange}/>;
				};

				if (showLimitBar) {
					return (
						<React.Fragment key={child.id}>
							{direction == "up" && getLimitBar()}
							{getNodeUI()}
							{direction == "down" && getLimitBar()}
						</React.Fragment>
					);
				}
				return getNodeUI();
			});
			// if direction is up, we need to have the first-in-children-array/highest-fill-percent entries show at the *bottom*, so reverse the children-uis array
			// if (direction == 'up') childrenHereUIs.reverse();

			const dragBox = document.querySelector(".NodeUI_Inner.DragPreview");
			const dragBoxRect = dragBox && VRect.FromLTWH(dragBox.getBoundingClientRect());

			//renderedChildrenOrder.push(...childrenHere.map(a=>a.id));
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
							<>
								<Column ref={c=>{ this[`${polarityGroup}ChildHolder`] = c; provided.innerRef(GetDOM(c) as any); }} ct className={refName} {...provided.droppableProps}
									style={E(
										{position: "relative"},
										childrenHere.length == 0 && {position: "absolute", top: polarityGroup == "down" ? "100%" : 0, width: MapNodeType_Info.for[MapNodeType.claim].minWidth, height: 100},
									)}>
									{/* childrenHere.length == 0 && <div style={{ position: 'absolute', top: '100%', width: '100%', height: 200 }}/> */}
									{provided.placeholder}
									{dragIsOverDropArea && placeholderRect &&
										<div style={{
											position: "absolute", left: 0 /* placeholderRect.x */, top: placeholderRect.y, width: childrenWidthOverride || placeholderRect.width, height: placeholderRect.height,
											border: "1px dashed rgba(255,255,255,1)", borderRadius: 5,
										}}/>}
								</Column>
								{childrenHereUIs}
							</>
						);
					}}
				</Droppable>
			);
		};

		const droppableInfo = new DroppableInfo({type: "NodeChildHolder", parentPath: path, childGroup: group});
		return (
			<>
				<Column ref={useCallback(c=>{
					this.childHolder = c;
				}, [])} className="NodeChildHolder clickThrough" style={E(
					{
						position: "relative", // needed so position:absolute in RenderGroup takes into account NodeUI padding
						// marginLeft: vertical ? 20 : (nodeChildrenToShow.length || showArgumentsControlBar) ? 30 : 0,
						//marginLeft: belowNodeUI ? 20 : 30,
						paddingLeft: belowNodeUI ? 20 : 30,
						// display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					},
					TreeGraphDebug() && {background: StripesCSS({angle: (treePath.split("/").length - 1) * 45, stripeColor: "rgba(255,150,0,.5)"})}, // for testing
					//belowNodeUI && {marginTop: -5, paddingTop: 5}, // fixes gap that was present
					//! expanded && {visibility: "hidden", height: 0}, // maybe temp; fix for lines-sticking-to-top issue
					// if we don't know our child offsets yet, render still (so we can measure ourself), but make self invisible
					//lastChildBoxOffsets == null && {opacity: 0, pointerEvents: "none"},
				)}>
					{/* if we're for multi-premise arg, and this comp is not already showing relevance-args, show them in a "Taken together, are these claims relevant?" box */}
					{/*IsMultiPremiseArgument(node) && group != ChildGroup.relevance &&
						<NodeChildHolderBox {...{map, node, path}} group={ChildGroup.relevance} widthOverride={childrenWidthOverride}
							widthOfNode={childrenWidthOverride}
							nodeChildren={GetNodeChildrenL3(node.id, path)} nodeChildrenToShow={nodeChildrenToShowInRelevanceBox}
							onHeightOrDividePointChange={dividePoint=>this.CheckForLocalChanges()}/>*/}
				</Column>
				{!separateChildren &&
					RenderPolarityGroup("all")}
				{separateChildren &&
					RenderPolarityGroup("up")}
				{showArgumentsControlBar &&
					<ArgumentsControlBar ref={c=>this.argumentsControlBar = c}
						map={map} node={node} path={path} treePath={`${treePath}/${nextChildFullIndex++}`}
						inBelowGroup={belowNodeUI ?? false}
						group={group} childBeingAdded={currentNodeBeingAdded_path == `${path}/?`}/>}
				{separateChildren &&
					RenderPolarityGroup("down")}
			</>
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
		//FlashComp(this, {text: "NodeChildHolder.CheckForLocalChanges"});
		// if (this.lastRender_source == RenderSource.SetState) return;
		const {node, onSizesChange} = this.props;

		//const height = GetDOM(this)!.getBoundingClientRect().height;
		const height = this.DOM_HTML.offsetHeight;
		const dividePoint = this.GetDividePoint();
		if (height != this.lastHeight || dividePoint != this.lastDividePoint) {
			MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
				()=>`OnHeightChange NodeChildHolder (${RenderSource[this.lastRender_source]}):${this.props.node.id}${nl}dividePoint:${dividePoint}`);

			// this.UpdateState(true);
			this.UpdateChildrenWidthOverride();
			if (onSizesChange) onSizesChange(dividePoint, height - dividePoint);
		}
		this.lastHeight = height;
		this.lastDividePoint = dividePoint;

		const orderStr = this.ChildOrderStr;
		if (orderStr != this.lastOrderStr) {
			// this.OnChildHeightOrPosOrOrderChange();
			// this.UpdateChildrenWidthOverride();
			// this.ReportDividePointChange();
		}
		this.lastOrderStr = orderStr;
	}

	OnChildHeightOrPosChange = ()=>{
		//FlashComp(this, {text: "NodeChildHolder.OnChildHeightOrPosChange"});
		const {node} = this.props;
		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
			()=>`OnChildHeightOrPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node.id}\ncenterY:${this.GetDividePoint()}`);

		// this.OnHeightOrPosChange();
		WaitXThenRun_Deduped(this, "OnChildHeightOrPosChange_lastPart", 0, ()=>{
			if (!this.mounted) return;
			this.UpdateChildrenWidthOverride();
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
}