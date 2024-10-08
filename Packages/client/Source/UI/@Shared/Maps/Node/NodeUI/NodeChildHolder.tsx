import {ChildGroup, GetChildLayout_Final, GetChildOrdering_Final, GetOrderingValue_AtPath, GetPathNodeIDs, IsSLModeOrLayout, DMap, NodeL3, NodeType, NodeType_Info, Polarity} from "dm_common";
import * as React from "react";
import {useCallback} from "react";
import {store} from "Store";
import {GetChildLimitInfoAtLocation, UseForcedExpandForPath} from "Store/main/maps.js";
import {GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {StripesCSS} from "tree-grapher";
import {SLMode, ShowHeader} from "UI/@SL/SL.js";
import {NodeUI} from "UI/@Shared/Maps/Node/NodeUI.js";
import {DroppableInfo} from "Utils/UI/DNDStructures.js";
import {TreeGraphDebug} from "Utils/UI/General.js";
import {GetViewportRect, MaybeLog, Observer, WaitXThenRun_Deduped} from "web-vcore";
import {E, emptyObj, IsSpecialEmptyArray, nl, ToJSON, Vector2, VRect, WaitXThenRun} from "js-vextensions";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "@hello-pangea/dnd";
import {Column} from "react-vcomponents";
import {BaseComponentPlus, GetDOM, RenderSource, UseCallback, WarnOfTransientObjectProps} from "react-vextensions";
import {GetPlaybackInfo} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {ArgumentsControlBar} from "../ArgumentsControlBar.js";
import {GUTTER_WIDTH, GUTTER_WIDTH_SMALL} from "../NodeLayoutConstants.js";
import {ChildLimitBar} from "./ChildLimitBar.js";
import {GetMeasurementInfoForNode} from "./NodeMeasurer.js";

type Props = {
	map: DMap, parentNode: NodeL3, parentPath: string, parentTreePath: string, parentTreePath_priorChildCount?: number, showEvenIfParentNotExpanded: boolean, group: ChildGroup,
	separateChildren: boolean, showArgumentsControlBar: boolean, belowNodeUI?: boolean, minWidth?: number,
	onSizesChange?: (aboveSize: number, belowSize: number)=>void,
	forLayoutHelper: boolean,
	nodeChildrenToShow: NodeL3[],
};
const initialState = {
	childrenWidthOverride: null as number|n,
	lastChildBoxOffsets: null as {[key: number]: Vector2}|n,
	placeholderRect: null as VRect|n,
};

@WarnOfTransientObjectProps
@Observer
export class NodeChildHolder extends BaseComponentPlus({minWidth: 0} as Props, initialState, {} as {nodeChildren_orderingValues: {[key: string]: number | string}}) {
	/*static ValidateProps(props) {
		let {node, path} = props;
		//Assert(SplitStringBySlash_Cached(path).Distinct().length == SplitStringBySlash_Cached(path).length, `Node path contains a circular link! (${path})`);
	}*/

	childBoxes: {[key: number]: NodeUI} = {};
	//childInnerUIs: {[key: number]: NodeBox} = {};
	render() {
		const {map, parentNode, parentPath, parentTreePath, parentTreePath_priorChildCount, group, separateChildren, showArgumentsControlBar, belowNodeUI, minWidth, forLayoutHelper, nodeChildrenToShow} = this.props;
		const {placeholderRect} = this.state;

		const playback = GetPlaybackInfo();
		const childLayout = GetChildLayout_Final(parentNode.current, map);
		const showArgumentsControlBar_final = showArgumentsControlBar && !(playback?.timeline && store.main.timelines.hideEditingControls) && !IsSLModeOrLayout(childLayout) && !store.main.maps.screenshotMode;

		const nodeView = GetNodeView(map.id, parentPath);
		const orderingType = GetChildOrdering_Final(parentNode, group, map, store.main.maps.childOrdering);
		const nodeChildren_orderingValues = nodeChildrenToShow.filter(a=>a).ToMapObj(child=>`${child.id}`, child=>{
			return GetOrderingValue_AtPath(child, `${parentPath}/${child.id}`, orderingType);
		}); //.SimplifyEmpty();
		this.Stash({nodeChildren_orderingValues});

		const {currentNodeBeingAdded_path} = store.main.maps;

		let nodeChildrenToShowHere = nodeChildrenToShow;
		// always apply an initial sorting by manual-ordering data, so that if main ordering values are the same for a set (eg. no vote data), the set still has sub-sorting
		nodeChildrenToShowHere = nodeChildrenToShowHere.OrderBy(a=>GetChildOrdering_Final(parentNode, group, map, store.main.maps.childOrdering));
		// then apply the sorting for the main ordering-type (latest OrderBy() operation has higher priority, naturally)
		nodeChildrenToShowHere = nodeChildrenToShowHere.OrderBy(child=>nodeChildren_orderingValues[child.id]);

		const upChildren = separateChildren ? nodeChildrenToShowHere.filter(a=>a.displayPolarity == Polarity.supporting) : [];
		const downChildren = separateChildren ? nodeChildrenToShowHere.filter(a=>a.displayPolarity == Polarity.opposing) : [];

		// if the map's root node, show all children
		/*const showAll_regular = parentNode.id == map.rootNode; //|| parentNode.type == NodeType.argument;
		const showAll_forForcedExpand = UseForcedExpandForPath(parentPath, forLayoutHelper);
		const showAll = showAll_regular || showAll_forForcedExpand;*/

		const PrepPolarityGroup = (polarityGroup: "all" | "up" | "down")=>{
			const direction = polarityGroup == "up" ? "up" : "down";
			const childrenHere_untrimmed = polarityGroup == "all" ? nodeChildrenToShowHere : polarityGroup == "up" ? upChildren : downChildren;
			const childLimitInfo = GetChildLimitInfoAtLocation(map, forLayoutHelper, parentNode, parentPath, direction, childrenHere_untrimmed.length);

			const childrenHere = childrenHere_untrimmed.slice(0, childLimitInfo.showTarget_actual); // trim to the X most significant children (ie. strongest arguments)
			// if direction is up, we need to have the first-in-children-array/highest-fill-percent entries show at the *bottom*, so reverse the children-here array
			if (direction == "up") childrenHere.reverse();

			return {direction: direction as "up" | "down", childLimitInfo, children_untrimmed: childrenHere_untrimmed, children_trimmed: childrenHere};
		};
		const ncToShowHere_groupAll = PrepPolarityGroup("all");
		const ncToShowHere_groupUp = PrepPolarityGroup("up");
		const ncToShowHere_groupDown = PrepPolarityGroup("down");

		const ncToShowHere_all_trimmed = [...ncToShowHere_groupAll.children_trimmed, ...ncToShowHere_groupUp.children_trimmed, ...ncToShowHere_groupDown.children_trimmed];
		const ncToShowHere_all_trimmed_measurements = ncToShowHere_all_trimmed.map(child=>{
			// catch bails during measurement, so child node-uis can start loading even before their measurements are done loading
			const measurementInfo = GetMeasurementInfoForNode.CatchBail(null, child, `${parentPath}/${child.id}`, map);
			// if measurement is still processing, return a default width (child node-uis needs some width in the meantime)
			if (measurementInfo == null) return {expectedBoxWidth: 100, width: 100, expectedHeight: null};
			return measurementInfo;
		});
		/*const childrenWidthOverride_prep = ncToShowHere_all_trimmed_measurements.map(a=>a.width).concat(0).Max(undefined, true);
		const childrenWidthOverride = childrenWidthOverride_prep ? childrenWidthOverride_prep.KeepAtLeast(minWidth ?? 0) : null;*/
		const childrenWidthOverride = ncToShowHere_all_trimmed_measurements.map(a=>a.width).concat(0).Max(undefined, true).KeepAtLeast(minWidth ?? 0);

		let nextChildFullIndex = parentTreePath_priorChildCount ?? 0;
		const RenderPolarityGroup = (polarityGroup: "all" | "up" | "down")=>{
			const ncToShowHere_thisGroup =
				polarityGroup == "all" ? ncToShowHere_groupAll :
				polarityGroup == "up" ? ncToShowHere_groupUp :
				ncToShowHere_groupDown;
			const childrenHere = ncToShowHere_thisGroup.children_trimmed;

			const showLimitBar = ncToShowHere_thisGroup.childLimitInfo.ShouldLimitBarShow() && !store.main.maps.screenshotMode;
			// wrap in func, so the execution-orders always match the display-orders (so that tree-path is correct)
			const getLimitBar = ()=>{
				return <ChildLimitBar key="limit-bar" {...{
					map, node: parentNode, path: parentPath, treePath: `${parentTreePath}/${nextChildFullIndex++}`,
					inBelowGroup: belowNodeUI ?? false,
					childrenWidthOverride,
					//childCount: ncToShowHere_thisGroup.children_untrimmed.length,
					childLimitInfo: ncToShowHere_thisGroup.childLimitInfo,
				}}/>;
			};

			const childrenHereAndLimitBarUIs = childrenHere.map((child, index)=>{
				const childHolderComp = this;

				const indexOfOutermostVisibleChild = ncToShowHere_thisGroup.direction == "down" ? childrenHere.length - 1 : 0; // the childrenHere array is already trimmed to the child-limit, so its first/last entry is the outermost visible
				const showLimitBarHere = index == indexOfOutermostVisibleChild && showLimitBar;

				const getNodeUI = ()=>{
					//const nodeIDAlreadyInPath = GetPathNodeIDs(parentPath).includes(child.id);
					return <NodeUI key={child.id}
						ref={UseCallback(c=>childHolderComp.childBoxes[child.id] = c, [child.id, childHolderComp.childBoxes])} // eslint-disable-line
						//ref_nodeBox={UseCallback(c=>WaitXThenRun_Deduped(childHolderComp, "UpdateChildBoxOffsets", 0, ()=>parent.UpdateChildBoxOffsets()), [parent])}
						indexInNodeList={index} map={map} node={child}
						path={`${parentPath}/${child.id}`}
						treePath={`${parentTreePath}/${nextChildFullIndex++}`}
						forLayoutHelper={forLayoutHelper}
						inBelowGroup={belowNodeUI}
						standardWidthInGroup={childrenWidthOverride}
						onHeightOrPosChange={childHolderComp.OnChildHeightOrPosChange}/>;
				};

				if (showLimitBarHere) {
					return (
						<React.Fragment key={child.id}>
							{ncToShowHere_thisGroup.direction == "up" && getLimitBar()}
							{getNodeUI()}
							{ncToShowHere_thisGroup.direction == "down" && getLimitBar()}
						</React.Fragment>
					);
				}
				return getNodeUI();
			});
			// special case: we need to manually add the limit-bar, if loop above never ran (due to children limit currently being at 0, ie. no children node-uis rendering atm)
			if (childrenHere.length == 0 && ncToShowHere_thisGroup.children_untrimmed.length > 0) {
				childrenHereAndLimitBarUIs.push(getLimitBar());
			}

			return (
				<Droppable type="NodeL1" droppableId={ToJSON(droppableInfo.VSet({subtype: polarityGroup, childIDs: childrenHere.map(a=>a.id)}))} /*renderClone={(provided, snapshot, descriptor) => {
					const index = descriptor.index;
					const pack = childrenHere.slice(0, childLimit)[index];
					return RenderChild(pack, index, childrenHere);
				}}*/>
					{(provided: DroppableProvided, snapshot: DroppableStateSnapshot)=>{
						const dragIsOverDropArea = (provided.placeholder as any)?.props["on"] != null;
						if (dragIsOverDropArea) {
							WaitXThenRun(0, ()=>this.StartGeneratingPositionedPlaceholder(polarityGroup));
						}

						const refName = `${polarityGroup}ChildHolder`;
						return (
							<>
								<Column ref={c=>{ this[`${polarityGroup}ChildHolder`] = c; provided.innerRef(GetDOM(c) as any); }} ct className={refName} {...provided.droppableProps}
									style={E(
										/*{position: "relative"},
										childrenHere.length == 0 && {position: "absolute", top: polarityGroup == "down" ? "100%" : 0, width: NodeType_Info.for[NodeType.claim].minWidth, height: 100},*/

										// for now, just use an absolutely-positioned, empty rect; doesn't allow actual dropping, but allows dragging *from* map onto timeline-steps -- proper fix required rework, for new layout system
										{position: "absolute", left: 0, top: 0, width: 0, height: 0},
									)}>
									{/* childrenHere.length == 0 && <div style={{ position: 'absolute', top: '100%', width: '100%', height: 200 }}/> */}
									{provided.placeholder}
									{dragIsOverDropArea && placeholderRect &&
										<div style={{
											position: "absolute", left: 0 /* placeholderRect.x */, top: placeholderRect.y, width: childrenWidthOverride || placeholderRect.width, height: placeholderRect.height,
											border: "1px dashed rgba(255,255,255,1)", borderRadius: 5,
										}}/>}
								</Column>
								{childrenHereAndLimitBarUIs}
							</>
						);
					}}
				</Droppable>
			);
		};

		const droppableInfo = new DroppableInfo({type: "NodeChildHolder", parentPath, childGroup: group});
		return (
			<>
				{!separateChildren &&
					RenderPolarityGroup("all")}
				{separateChildren &&
					RenderPolarityGroup("up")}
				{showArgumentsControlBar_final &&
					<ArgumentsControlBar ref={c=>this.argumentsControlBar = c}
						map={map} node={parentNode} path={parentPath} treePath={`${parentTreePath}/${nextChildFullIndex++}`}
						inBelowGroup={belowNodeUI ?? false}
						group={group} childBeingAdded={currentNodeBeingAdded_path == `${parentPath}/?`}/>}
				{separateChildren &&
					RenderPolarityGroup("down")}
			</>
		);
	}
	/*childHolder: Column|n;
	allChildHolder: Column|n;
	upChildHolder: Column|n;
	downChildHolder: Column|n;*/
	argumentsControlBar: ArgumentsControlBar|n;

	StartGeneratingPositionedPlaceholder(group: "all" | "up" | "down") {
		// commented; requires having a child-holder element, which we don't have atm (and commenting is fine, since drag-and-drop is accepted as not being implemented in the new layout system yet)
		// (the child-holder component is merely a construct to facilitate rendering of node-ui components)
		// (we would need to use a new approach for showing a placeholder, that is compatible with the layout being handled by the tree-grapher module)

		/*const groups = {all: this.allChildHolder, up: this.upChildHolder, down: this.downChildHolder};
		const childHolder = groups[group];
		if (childHolder == null || !childHolder.mounted) {
			// call again in a second, once child-holder is initialized
			WaitXThenRun(0, ()=>this.StartGeneratingPositionedPlaceholder(group));
			return;
		}

		const childHolderRect = VRect.FromLTWH(childHolder.DOM!.getBoundingClientRect());
		/* const match = firstOffsetInner.style.transform.match(/([0-9]+).+?([0-9]+)/);
		const dragBoxSize = new Vector2(match[1].ToInt(), match[2].ToInt());
		// delete dragInfo.provided.draggableProps.style.transform; *#/
		const dragBox = document.querySelector(".NodeBox.DragPreview");
		if (dragBox == null) return; // this can happen at end of drag
		const dragBoxRect = VRect.FromLTWH(dragBox.getBoundingClientRect());

		const siblingNodeUIs = (Array.from(childHolder.DOM!.childNodes) as HTMLElement[]).filter(a=>a.classList.contains("NodeUI"));
		const siblingNodeUIInnerDOMs = siblingNodeUIs.map(nodeUI=>nodeUI.QuerySelector_BreadthFirst(".NodeBox")).filter(a=>a != null) as HTMLElement[]; // entry can be null if inner-ui still loading
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

		if (!placeholderRect.Equals(this.state.placeholderRect)) {
			this.SetState({placeholderRect});
		}*/
	}

	get ShouldChildrenShow() {
		const {map, parentPath: path, group, showEvenIfParentNotExpanded} = this.props;
		const nodeView = GetNodeView(map.id, path)!;
		return nodeView.expanded || showEvenIfParentNotExpanded;
	}

	get ChildOrderStr() {
		const {nodeChildrenToShow, nodeChildren_orderingValues} = this.PropsStash;
		return nodeChildrenToShow.OrderBy(a=>nodeChildren_orderingValues?.[a.id] ?? 0).map(a=>a.id).join(",");
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
		const {parentNode: node, onSizesChange} = this.props;

		//const height = GetDOM(this)!.getBoundingClientRect().height;
		const height = this.DOM_HTML.offsetHeight;
		const dividePoint = this.GetDividePoint();
		if (height != this.lastHeight || dividePoint != this.lastDividePoint) {
			MaybeLog(
				a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
				()=>`OnHeightChange NodeChildHolder (${RenderSource[this.lastRender_source]}):${this.props.parentNode.id}${nl}dividePoint:${dividePoint}`,
			);

			// this.UpdateState(true);
			if (onSizesChange) onSizesChange(dividePoint, height - dividePoint);
		}
		this.lastHeight = height;
		this.lastDividePoint = dividePoint;

		const orderStr = this.ChildOrderStr;
		if (orderStr != this.lastOrderStr) {
			// this.OnChildHeightOrPosOrOrderChange();
			// this.ReportDividePointChange();
		}
		this.lastOrderStr = orderStr;
	}

	OnChildHeightOrPosChange = ()=>{
		//FlashComp(this, {text: "NodeChildHolder.OnChildHeightOrPosChange"});
		const {parentNode: node} = this.props;
		MaybeLog(
			a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
			()=>`OnChildHeightOrPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.parentNode.id}\ncenterY:${this.GetDividePoint()}`,
		);

		// this.OnHeightOrPosChange();
		WaitXThenRun_Deduped(this, "OnChildHeightOrPosChange_lastPart", 0, ()=>{
			if (!this.mounted) return;
			this.CheckForLocalChanges();
		});
	};

	GetDividePoint() {
		return 0;
		// commented; needs re-implementing to work with tree-grapher layout system
		/*if (this.argumentsControlBar) {
			// return upChildHolder.css("display") != "none" ? upChildHolder.outerHeight() : 0;
			return this.childHolder && (this.childHolder.DOM as HTMLElement).style.visibility != "hidden"
				? GetViewportRect(this.argumentsControlBar.DOM!).Center.y + 1 - GetViewportRect(this.childHolder.DOM!).y
				: 0;
		}
		// return childHolder.css("display") != "none" ? childHolder.outerHeight() / 2 : 0,
		return this.childHolder?.DOM && (this.childHolder.DOM as HTMLElement).style.visibility != "hidden" ? GetViewportRect(this.childHolder.DOM!).height / 2 : 0;*/
	}
}