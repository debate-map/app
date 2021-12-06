import {ChildGroup, ClaimForm, GetChangeTypeOutlineColor, GetMainRatingType, GetNodeForm, GetNodeL3, GetPaddingForNode, GetPathNodeIDs, IsMultiPremiseArgument, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument, IsUserCreatorOrMod, Map, MapNodeL3, MapNodeType, MapNodeType_Info, MapNodeView, MeID, NodeRatingType, ReasonScoreValues_RSPrefix, RS_CalculateTruthScore, RS_CalculateTruthScoreComposite, RS_GetAllValues, WeightingType} from "dm_common";
import React, {useEffect, useState} from "react";
import {store} from "Store";
import {GetNodeChangeType} from "Store/db_ext/mapNodeEdits.js";
import {GetNodeColor} from "Store/db_ext/nodes";
import {GetTimeFromWhichToShowChangedNodes} from "Store/main/maps/mapStates/$mapState.js";
import {ACTMapNodeExpandedSet, ACTMapNodeSelect, GetNodeView, GetNodeViewsAlongPath} from "Store/main/maps/mapViews/$mapView.js";
import {GADDemo, GADMainFont} from "UI/@GAD/GAD.js";
import {DraggableInfo} from "Utils/UI/DNDStructures.js";
import {IsMouseEnterReal, IsMouseLeaveReal} from "Utils/UI/General.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {DragInfo, HSLA, IsDoubleClick, Observer, RunInAction, RunInAction_Set, UseDocumentEventListener} from "web-vcore";
import chroma, {Color} from "web-vcore/nm/chroma-js.js";
//import classNames from "classnames";
import {DEL, DoNothing, E, NN, Timer, ToJSON, Vector2, VRect, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {Draggable} from "web-vcore/nm/react-beautiful-dnd.js";
import ReactDOM from "web-vcore/nm/react-dom.js";
import {BaseComponent, BaseComponentPlus, GetDOM, UseCallback, UseEffect} from "web-vcore/nm/react-vextensions.js";
import {NodeUI_BottomPanel} from "./DetailBoxes/NodeUI_BottomPanel.js";
import {MapNodeUI_LeftBox} from "./DetailBoxes/NodeUI_LeftBox.js";
import {DefinitionsPanel} from "./DetailBoxes/Panels/DefinitionsPanel.js";
import {RatingsPanel} from "./DetailBoxes/Panels/RatingsPanel.js";
import {ExpandableBox} from "./ExpandableBox.js";
import {NodeToolbar} from "./NodeUI_Inner/NodeToolbar.js";
import {SubPanel} from "./NodeUI_Inner/SubPanel.js";
import {TitlePanel} from "./NodeUI_Inner/TitlePanel.js";
import {NodeUI_Menu_Stub} from "./NodeUI_Menu.js";

// drag and drop
// ==========

/* const dragSourceDecorator = DragSource('node',
	{
		canDrag: ({ map, node, path }) => ForCopy_GetError(MeID(), node) == null,
		beginDrag: ({ map, node, path }) => ({ map, node, path }),
	},
	(connect, monitor) => ({
		connectDragSource: connect.dragSource(),
		isDragging: monitor.isDragging(),
	})); */

// main
// ==========

// export type NodeHoverExtras = {panel?: string, term?: number};

export type NodeUI_Inner_Props = {
	indexInNodeList: number, node: MapNodeL3, path: string, map?: Map,
	width?: number|n, widthOverride?: number|n, backgroundFillPercentOverride?: number,
	panelsPosition?: "left" | "below", useLocalPanelState?: boolean, style?,
	usePortalForDetailBoxes?: boolean,
} & {dragInfo?: DragInfo};

/* @MakeDraggable(({ node, path, indexInNodeList }: TitlePanelProps) => {
	if (!IsUserCreatorOrMod(MeID(), node)) return null;
	if (!path.includes('/')) return null; // don't make draggable if root-node of map
	return {
		type: 'MapNode',
		draggableInfo: new DraggableInfo({ nodePath: path }),
		index: indexInNodeList,
	};
}) */

// @ExpensiveComponent
@Observer
export class NodeUI_Inner extends BaseComponentPlus(
	{panelsPosition: "left"} as NodeUI_Inner_Props,
	{
		hovered: false, moreButtonHovered: false, leftPanelHovered: false, //openPanelSource: null as PanelOpenSource|n,
		hoverPanel: null as string|n, hoverTermID: null as string|n, lastWidthWhenNotPreview: 0,
	},
) {
	root: ExpandableBox|n;
	titlePanel: TitlePanel|n;
	leftPanel: MapNodeUI_LeftBox|n;
	bottomPanel: NodeUI_BottomPanel|n;

	// todo: replace this system by just using the new IsMouseEnterReal and IsMouseLeaveReal functions
	checkStillHoveredTimer = new Timer(100, ()=>{
		const dom = GetDOM(this.root);
		if (dom == null) {
			this.checkStillHoveredTimer.Stop();
			return;
		}
		const mainRect = VRect.FromLTWH(dom.getBoundingClientRect());

		//const leftBoxDOM = dom.querySelector(".NodeUI_LeftBox");
		const leftBoxDOM = this.leftPanel?.DOM;
		const leftBoxRect = leftBoxDOM ? VRect.FromLTWH(leftBoxDOM.getBoundingClientRect()) : null;

		//const bottomPanelDOM = dom.querySelector(".NodeUI_BottomPanel");
		const bottomPanelDOM = this.bottomPanel?.DOM;
		const bottomPanelRect = bottomPanelDOM ? VRect.FromLTWH(bottomPanelDOM.getBoundingClientRect()).NewTop(top=>top - 1) : null; // add 1px to top, for box-shadow outline

		const mouseRect = new VRect(mousePos, new Vector2(1, 1));
		const intersectsOne = !!(mouseRect.Intersects(mainRect) || (leftBoxRect && mouseRect.Intersects(leftBoxRect)) || (bottomPanelRect && mouseRect.Intersects(bottomPanelRect)));
		// Log(`Main: ${mainRect} Mouse:${mousePos} Intersects one?:${intersectsOne}`);
		this.SetState({hovered: intersectsOne});

		if (!intersectsOne) {
			this.checkStillHoveredTimer.Stop();
		}
	});

	render() {
		const {indexInNodeList, map, node, path, width, widthOverride, backgroundFillPercentOverride, panelsPosition, useLocalPanelState, style, usePortalForDetailBoxes} = this.props;
		let {hovered, moreButtonHovered, leftPanelHovered, hoverPanel, hoverTermID, lastWidthWhenNotPreview} = this.state;

		// connector part
		// ==========

		const [local_nodeView, setLocal_nodeView] = useState({} as MapNodeView);
		const nodeView = useLocalPanelState ? local_nodeView : GetNodeView(map?.id, path);
		const UpdateLocalNodeView = (updates: Partial<MapNodeView>)=>{
			//setLocal_nodeView({...local_nodeView, ...updates});
			// rather than call setLocal_nodeView, mutate the existing object, then force-update; this way multiple UpdateLocalNodeView calls in the same tick will succeed (eg. onClick and onPanelButtonClick)
			local_nodeView.VSet(updates);
			this.Update();
		};

		const sinceTime = GetTimeFromWhichToShowChangedNodes(map?.id);
		/*let pathsToChangedNodes = GetPathsToNodesChangedSinceX(map._id, sinceTime);
		let ownNodeChanged = pathsToChangedNodes.Any(a=>a.split("/").Any(b=>b == node._id));
		let changeType = ownNodeChanged ? GetNodeChangeType(node, sinceTime) : null;*/
		const changeType = GetNodeChangeType(node, sinceTime);

		const parentPath = SlicePath(path, 1);
		const parent = GetNodeL3(parentPath);
		const combinedWithParentArgument = parent ? IsPremiseOfSinglePremiseArgument(node, parent)! : false; // nn, else would bail
		//const outerPath = IsPremiseOfSinglePremiseArgument(node, parent) ? SlicePath(path, 1) : path;
		//const outerNode = IsPremiseOfSinglePremiseArgument(node, parent) ? parent : node;

		let mainRatingType = GetMainRatingType(node);
		let ratingNode = node;
		let ratingNodePath = path;
		if (combinedWithParentArgument) {
			mainRatingType = NodeRatingType.impact;
			ratingNode = parent!;
			ratingNodePath = parentPath!;
		}
		/* const mainRating_average = Watch(() => GetRatingAverage_AtPath(ratingNode, mainRatingType));
		// let mainRating_mine = GetRatingValue(ratingNode._id, mainRatingType, MeID());
		const mainRating_mine = Watch(() => GetRatingAverage_AtPath(ratingNode, mainRatingType, new RatingFilter({ includeUser: MeID() }))); */

		const useReasonScoreValuesForThisNode = store.main.maps.weighting == WeightingType.reasonScore && (node.type == MapNodeType.argument || node.type == MapNodeType.claim);
		const reasonScoreValues = useReasonScoreValuesForThisNode && RS_GetAllValues(node.id, path, true) as ReasonScoreValues_RSPrefix;

		//const backgroundFillPercent = backgroundFillPercentOverride ?? GetFillPercent_AtPath(ratingNode, ratingNodePath, null);
		const backgroundFillPercent = backgroundFillPercentOverride ?? 100;
		//const markerPercent = GetMarkerPercent_AtPath(ratingNode, ratingNodePath, null);
		const markerPercent = null; // marker is too distracting to be enabled for-now/by-default

		const nodeForm = GetNodeForm(node, path);
		//const phrasings = GetNodePhrasings(node.id);
		const {showReasonScoreValues} = store.main.maps;

		/*/*const playingTimeline_currentStepRevealNodes = GetPlayingTimelineCurrentStepRevealNodes(map.id);
		let revealedByCurrentTimelineStep = playingTimeline_currentStepRevealNodes.Contains(path);
		if (combinedWithParentArgument) {
			revealedByCurrentTimelineStep = revealedByCurrentTimelineStep || playingTimeline_currentStepRevealNodes.Contains(parentPath);
		}*#/
		const nodeRevealHighlightTime = GetNodeRevealHighlightTime();
		const timeSinceRevealedByTimeline_self = GetTimeSinceNodeRevealedByPlayingTimeline(map.id, path, true, true);
		const timeSinceRevealedByTimeline_parent = GetTimeSinceNodeRevealedByPlayingTimeline(map.id, parentPath, true, true);
		let timeSinceRevealedByTimeline = timeSinceRevealedByTimeline_self;
		if (combinedWithParentArgument && timeSinceRevealedByTimeline_parent != null) {
			timeSinceRevealedByTimeline = timeSinceRevealedByTimeline != null ? Math.min(timeSinceRevealedByTimeline, timeSinceRevealedByTimeline_parent) : timeSinceRevealedByTimeline_parent;
		}*/

		// the rest
		// ==========

		UseEffect(()=>{
			/* const { dragInfo } = this.props;
			const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
			if (!asDragPreview && this.draggableDiv) { */
			// setDragActive(this.root.DOM.getBoundingClientRect().width);
			if (this.root?.DOM) {
				if (this.root.DOM.getBoundingClientRect().width != lastWidthWhenNotPreview) {
					this.SetState({lastWidthWhenNotPreview: this.root.DOM.getBoundingClientRect().width});
				}
			}
		});

		const nodeTypeInfo = MapNodeType_Info.for[node.type];
		let backgroundColor = GetNodeColor(node);
		/* const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
		// const offsetByAnotherDrag = dragInfo && dragInfo.provided.draggableProps.style.transform;
		if (asDragPreview) {
			hovered = false;
			local_openPanel = null;
		} */

		// Log(`${node.id} -- ${dragInfo && dragInfo.snapshot.isDragging}; ${dragInfo && dragInfo.snapshot.draggingOver}`);

		if (combinedWithParentArgument) {
			backgroundColor = GetNodeColor(parent!);
		}

		const outlineColor = GetChangeTypeOutlineColor(changeType);
		const barSize = 5;
		const pathNodeIDs = GetPathNodeIDs(path);
		//const isSubnode = IsNodeSubnode(node);
		const isSinglePremiseArg = IsSinglePremiseArgument(node);
		const isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);
		const isMultiPremiseArg = IsMultiPremiseArgument(node);

		const nodeReversed = nodeForm == ClaimForm.negation;

		const selected = nodeView?.selected || false;
		const leftPanelPinned = nodeView?.leftPanelPinned ?? false;
		/*const [leftPanelPinned, setLeftPanelPinned] = useState(false);
		useEffect(()=>{
			// if left-panel is pinned, but node is no longer selected or hovered, reset its "pinned" state to false
			if (leftPanelPinned && !(selected || hovered)) setLeftPanelPinned(false); 
		}, [selected, leftPanelPinned]);*/

		const panelToShow = hoverPanel || nodeView?.openPanel;
		const leftPanelShow = leftPanelPinned || moreButtonHovered || leftPanelHovered; // || (/*selected &&*/ panelToShow != null && openPanelSource == "left-panel");
		const subPanelShow = node.type == MapNodeType.claim && (node.current.references || node.current.quote || node.current.media);
		const bottomPanelShow = /*(selected || hovered) &&*/ panelToShow != null;
		let expanded = nodeView?.expanded ?? false;

		// const parentNodeView = GetNodeView(map.id, parentPath);
		// const parentNodeView = Watch(() => parentPath && GetNodeView_SelfOnly(map.id, parentPath), [map.id, parentPath]);
		const parentNodeView = GetNodeView(map?.id, parentPath);
		// if combined with parent arg (ie. premise of single-premise arg), use parent's expansion state for this box
		if (combinedWithParentArgument) {
			expanded = parentNodeView?.expanded ?? false;
		}

		const onMouseEnter = UseCallback(e=>{
			if (!IsMouseEnterReal(e, this.DOM_HTML)) return;
			this.SetState({hovered: true});
			this.checkStillHoveredTimer.Start();
		}, []);
		const onMouseLeave = UseCallback(e=>{
			if (!IsMouseLeaveReal(e, this.DOM_HTML)) return;
			this.SetState({hovered: false});
			this.checkStillHoveredTimer.Stop();
		}, []);
		const onClick = UseCallback(e=>{
			if ((e.nativeEvent as any).ignore) return;
			if (useLocalPanelState && !local_nodeView.selected) {
				UpdateLocalNodeView({selected: true});
				return;
			}

			if (!nodeView?.selected && map) {
				ACTMapNodeSelect(map.id, path);
			}
		}, [local_nodeView.selected, map, nodeView?.selected, path, useLocalPanelState]);
		if (usePortalForDetailBoxes) {
			UseDocumentEventListener("click", e=>{
				const uiRoots = [this.root?.DOM, this.leftPanel?.DOM, this.bottomPanel?.DOM].filter(a=>a);
				// if user clicked outside of node-ui-inner's descendant tree, close the detail-boxes
				if (uiRoots.every(a=>!a!.contains(e.target as HTMLElement))) {
					UpdateLocalNodeView({selected: undefined, openPanel: undefined, leftPanelPinned: undefined});
				}
			});
		}
		const onDirectClick = UseCallback(e=>{
			RunInAction("NodeUI_Inner.onDirectClick", ()=>{
				if (combinedWithParentArgument && parent) {
					store.main.maps.nodeLastAcknowledgementTimes.set(parent.id, Date.now());
				}
				store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now());
			});
		}, [combinedWithParentArgument, node.id, parent]);
		const onTextCompClick = UseCallback(e=>IsDoubleClick(e) && this.titlePanel && this.titlePanel.OnDoubleClick(), []);
		const toggleExpanded = UseCallback(e=>{
			/* let pathToApplyTo = path;
			// if collapsing subtree, and this node is premise of single-premise arg, start collapsing from parent (the argument node), so that its relevance args are collapsed as well
			if (expanded && e.altKey && combinedWithParentArgument) {
				pathToApplyTo = parentPath;
			}
			store.dispatch(new ACTMapNodeExpandedSet({ mapID: map.id, path: pathToApplyTo, expanded: !expanded, recursive: expanded && e.altKey })); */

			// if collapsing subtree, and this node is premise of single-premise arg, start collapsing from parent (the argument node), so that its relevance args are collapsed as well
			const recursivelyCollapsing = expanded && e.altKey;
			ACTMapNodeExpandedSet({mapID: map?.id, path: combinedWithParentArgument ? parentPath! : path, expanded: !expanded, resetSubtree: recursivelyCollapsing});
			e.nativeEvent["ignore"] = true; // for some reason, "return false" isn't working
			// return false;
		}, [combinedWithParentArgument, expanded, map?.id, parentPath, path]);

		const renderInner = (dragInfo?: DragInfo)=>{
			const asDragPreview = dragInfo?.snapshot.isDragging;
			// const offsetByAnotherDrag = dragInfo?.provided.draggableProps.style.transform;
			if (asDragPreview) {
				hovered = false;
				//local_openPanel = null; // todo: reimplement equivalent (if still needed)
			}
			const onPanelButtonClick = (panel: string, source: "toolbar" | "left-panel")=>{
				//this.SetState({openPanelSource: source});

				/*if (useLocalPanelState) {
					UpdateLocalNodeView({openPanel: undefined});
					this.SetState({hoverPanel: null});
					return;
				}*/

				RunInAction("NodeUI_Inner.onPanelButtonClick", ()=>{
					const nodeView_final = nodeView ?? GetNodeViewsAlongPath(map?.id, path, true).Last();

					// if clicking on a not-currently open panel, set panel to that; else, must be clicking on currently-open panel, so clear
					const newPanel = panel != nodeView_final.openPanel ? panel : undefined;
					nodeView_final.openPanel = newPanel;

					//nodeView_final.VSet("leftPanelPinned", source == "left-panel" && newPanel != null ? true : DEL);
					nodeView_final.leftPanelPinned = source == "left-panel" && newPanel != null ? true : undefined;

					if (newPanel == null) {
						this.SetState({hoverPanel: null});
					}

					// if using local-panel-state, manually trigger update at end (since mobx not activated for the local-node-view object)
					if (useLocalPanelState) this.Update();
				});
			};
			return (
				<>
				<ExpandableBox ref={c=>DoNothing(dragInfo?.provided.innerRef(GetDOM(c) as any), this.root = c)}
					{...{width, widthOverride, outlineColor, expanded}} parent={this}
					className={
						//classNames("NodeUI_Inner", asDragPreview && "DragPreview", {root: pathNodeIDs.length == 0})
						["NodeUI_Inner", asDragPreview && "DragPreview", pathNodeIDs.length == 0 && "root"].filter(a=>a).join(" ")
					}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
					{...dragInfo?.provided.draggableProps} // {...dragInfo?.provided.dragHandleProps} // drag-handle is attached to just the TitlePanel, below
					style={E(
						/*timeSinceRevealedByTimeline != null && timeSinceRevealedByTimeline <= nodeRevealHighlightTime &&
							{boxShadow: `rgba(255,255,0,${1 - (timeSinceRevealedByTimeline / nodeRevealHighlightTime)}) 0px 0px 7px, rgb(0, 0, 0) 0px 0px 2px`},*/
						style,
						dragInfo?.provided.draggableProps.style,
						asDragPreview && {zIndex: zIndexes.draggable},
						//outerNode.link._mirrorLink && {border: `solid ${HSLA(0, 0, 1, .3)}`, borderWidth: "0 0 0 1px"}, // if mirror-child, show white border at left
					)}
					//padding={GetPaddingForNode(node/*, isSubnode*/)}
					padding={0}
					onClick={onClick}
					onDirectClick={onDirectClick}
					beforeChildren={<>
						{leftPanelShow &&
						<MapNodeUI_LeftBox {...{map, path, node, panelsPosition, backgroundColor}} local_nodeView={useLocalPanelState ? local_nodeView : null} asHover={hovered}
							ref={c=>this.leftPanel = c}
							usePortal={usePortalForDetailBoxes} nodeUI={this}
							onPanelButtonHover={panel=>this.SetState({hoverPanel: panel})}
							onPanelButtonClick={panel=>onPanelButtonClick(panel, "left-panel")}
							onHoverChange={hovered=>this.SetState({leftPanelHovered: hovered})}
						>
							{/* fixes click-gap */}
							{panelsPosition == "below" && <div style={{position: "absolute", right: -1, width: 1, top: 0, bottom: 0}}/>}
						</MapNodeUI_LeftBox>}
						{/* fixes click-gap */}
						{/*leftPanelShow && panelsPosition == "left" && <div style={{position: "absolute", right: "100%", width: 1, top: 0, bottom: 0}}/>*/}
					</>}
					//onTextHolderClick={onTextHolderClick}
					text={<>
						{!GADDemo && (()=>{
							// include this in "text" prop, because that makes the sizing exclude the +/- button
							let ratingsPanel: JSX.Element;
							if (node.type == MapNodeType.claim && combinedWithParentArgument) {
								const argumentNode = NN(parent);
								const argumentPath = NN(SlicePath(path, 1));
								ratingsPanel = <RatingsPanel node={argumentNode} path={argumentPath} ratingType={NodeRatingType.impact} asNodeUIOverlay={true}/>;
							} else {
								ratingsPanel = <RatingsPanel node={node} path={path} ratingType={NodeRatingType.truth} asNodeUIOverlay={true}/>;
							}
							return <div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
								{ratingsPanel}
							</div>;
						})()}
						<TitlePanel {...{indexInNodeList, parent: this, map, node, path}} {...dragInfo?.provided.dragHandleProps}
							ref={c=>this.titlePanel = c}
							//onClick={onTextHolderClick} // not needed; TitlePanel already handles double-clicks
							style={{padding: GetPaddingForNode(node/*, isSubnode*/)}}/>
						{subPanelShow &&
						<SubPanel node={node} /*onClick={onTextCompClick}*//>}
						<NodeToolbar {...this.props} backgroundColor={backgroundColor} panelToShow={panelToShow} onPanelButtonClick={panel=>onPanelButtonClick(panel, "toolbar")}
							leftPanelShow={leftPanelShow}
							onMoreClick={()=>{
								//onClick();
								//RunInAction_Set(this, ()=>store.main.maps.nodeLeftBoxEnabled = !store.main.maps.nodeLeftBoxEnabled);
								//setLeftPanelPinned(!leftPanelPinned);
								RunInAction_Set(this, ()=>nodeView.leftPanelPinned = !nodeView.leftPanelPinned);
							}}
							onMoreHoverChange={hovered=>{
								//if (!IsMouseEnterReal(e, this.DOM_HTML)) return;
								this.SetState({moreButtonHovered: hovered});
							}}/>
						<NodeUI_Menu_Stub {...{map, node, path}} childGroup={ChildGroup.generic}/>
					</>}
					{...E(
						{backgroundFillPercent, backgroundColor, markerPercent},
						GADDemo && {backgroundFillPercent: 100},
					)}
					toggleExpanded={toggleExpanded}
					afterChildren={<>
						{bottomPanelShow
							&& <NodeUI_BottomPanel {...{map, node, path, parent, width, widthOverride, hovered, backgroundColor}}
								ref={c=>this.bottomPanel = c}
								usePortal={usePortalForDetailBoxes} nodeUI={this}
								panelsPosition={panelsPosition!} panelToShow={panelToShow!}
								hoverTermID={hoverTermID} onTermHover={termID=>this.SetState({hoverTermID: termID})}/>}
						{reasonScoreValues && showReasonScoreValues
							&& <ReasonScoreValueMarkers {...{node, combinedWithParentArgument, reasonScoreValues}}/>}
					</>}
				/>
				</>
			);
		};

		/* if (asDragPreview) {
			return ReactDOM.createPortal(result, portal);
		} */
		// return result;

		const GetDNDProps = ()=>{
			if (!IsUserCreatorOrMod(MeID(), node)) return null;
			if (!path.includes("/")) return null; // don't make draggable if root-node of map
			return {
				type: "MapNode",
				draggableInfo: new DraggableInfo({nodePath: path, mapID: map?.id}), // mapID needed for DND-completer to create the link command
				index: indexInNodeList,
			};
		};
		const dndProps = GetDNDProps();
		if (dndProps == null) {
			return renderInner();
		}

		const draggableID = ToJSON(dndProps.draggableInfo);
		return (
			<>
				{/* <div>asDragPreview: {asDragPreview}</div> */}
				<Draggable /*type={dndProps.type}*/ key={draggableID} draggableId={draggableID} index={dndProps.index}>
					{(provided, snapshot)=>{
						const dragInfo: DragInfo = {provided, snapshot};
						const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;

						// if drag preview, we have to put in portal, since otherwise the "filter" effect of ancestors causes the {position:fixed} style to not be relative-to-page
						if (asDragPreview) return ReactDOM.createPortal(renderInner(dragInfo), portal);
						return renderInner(dragInfo);
					}}
				</Draggable>
				<div style={{width: lastWidthWhenNotPreview}}/>
			</>
		);
	}
	definitionsPanel: DefinitionsPanel;
}

let portal: HTMLElement;
WaitXThenRun(0, ()=>{
	portal = document.createElement("div");
	document.body.appendChild(portal);
});

class ReasonScoreValueMarkers extends BaseComponent<{node: MapNodeL3, reasonScoreValues: ReasonScoreValues_RSPrefix, combinedWithParentArgument: boolean}, {}> {
	render() {
		const {node, reasonScoreValues, combinedWithParentArgument} = this.props;
		const mainScore = node.type == MapNodeType.argument ? RS_CalculateTruthScoreComposite(node.id) : RS_CalculateTruthScore(node.id);
		const {rs_argTruthScoreComposite, rs_argWeightMultiplier, rs_argWeight, rs_claimTruthScore, rs_claimBaseWeight} = reasonScoreValues;
		return (
			<div className="clickThrough" style={{position: "absolute", top: "100%", width: "100%", zIndex: 1, textAlign: "center", fontSize: 14}}>
				{node.type == MapNodeType.argument && `Truth score: ${mainScore.ToPercentStr()}${
					` Weight: [...]x${rs_argWeightMultiplier.RoundTo_Str(0.01)} = ${rs_argWeight.RoundTo_Str(0.01)}`
				}`}
				{node.type == MapNodeType.claim && `Truth score: ${mainScore.ToPercentStr()}${
					combinedWithParentArgument
						? ` Weight: ${rs_claimBaseWeight.RoundTo_Str(0.01)}x${rs_argWeightMultiplier.RoundTo_Str(0.01)} = ${rs_argWeight.RoundTo_Str(0.01)}`
						: ""
				}`}
			</div>
		);
	}
}