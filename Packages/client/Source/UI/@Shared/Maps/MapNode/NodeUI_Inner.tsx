import {ChangeType, ClaimForm, GetChangeTypeOutlineColor, GetFillPercent_AtPath, GetMainRatingType, GetMarkerPercent_AtPath, GetNodeForm, GetNodeL3, GetPaddingForNode, GetRatings, HolderType, IsPremiseOfSinglePremiseArgument, IsUserCreatorOrMod, Map, MapNodeL3, MapNodeType, MapNodeType_Info, MeID, NodeRatingType, ReasonScoreValues_RSPrefix, RS_CalculateTruthScore, RS_CalculateTruthScoreComposite, RS_GetAllValues, WeightingType} from "dm_common";
import chroma, {Color} from "chroma-js";
//import classNames from "classnames";
import {A, DEL, DoNothing, E, GetValues, NN, Timer, ToJSON, Vector2, VRect, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Bail, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import React from "react";
import {Draggable} from "web-vcore/nm/react-beautiful-dnd.js";
import ReactDOM from "web-vcore/nm/react-dom";
import {BaseComponent, BaseComponentPlus, GetDOM, UseCallback, UseEffect} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {GetNodeColor} from "Store/db_ext/nodes";
import {GetLastAcknowledgementTime} from "Store/main/maps";
import {ACTMapNodeExpandedSet, ACTMapNodeSelect, GetNodeView, GetNodeViewsAlongPath, GetPathNodeIDs} from "Store/main/maps/mapViews/$mapView.js";
import {GADDemo, GADMainFont} from "UI/@GAD/GAD.js";
import {DraggableInfo} from "Utils/UI/DNDStructures.js";
import {IsMouseEnterReal, IsMouseLeaveReal} from "Utils/UI/General.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {DragInfo, EB_ShowError, EB_StoreError, HSLA, IsDoubleClick, Observer, RunInAction} from "web-vcore";
import {ExpandableBox} from "./ExpandableBox.js";
import {DefinitionsPanel} from "./NodeUI/Panels/DefinitionsPanel.js";
import {DetailsPanel} from "./NodeUI/Panels/DetailsPanel.js";
import {DiscussionPanel} from "./NodeUI/Panels/DiscussionPanel.js";
import {HistoryPanel} from "./NodeUI/Panels/HistoryPanel.js";
import {OthersPanel} from "./NodeUI/Panels/OthersPanel.js";
import {RatingsPanel} from "./NodeUI/Panels/RatingsPanel.js";
import {SocialPanel} from "./NodeUI/Panels/SocialPanel.js";
import {TagsPanel} from "./NodeUI/Panels/TagsPanel.js";
import {SubPanel} from "./NodeUI_Inner/SubPanel.js";
import {TitlePanel} from "./NodeUI_Inner/TitlePanel.js";
import {MapNodeUI_LeftBox} from "./NodeUI_LeftBox.js";
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

type Props = {
	indexInNodeList: number, map: Map, node: MapNodeL3, path: string, width?: number|n, widthOverride?: number|n,
	panelPosition?: "left" | "below", useLocalPanelState?: boolean, style?,
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
	{panelPosition: "left"} as Props,
	{hovered: false, hoverPanel: null as string|n, hoverTermID: null as string|n, local_openPanel: null as string|n, lastWidthWhenNotPreview: 0},
) {
	root: ExpandableBox|n;
	titlePanel: TitlePanel|n;

	// todo: replace this system by just using the new IsMouseEnterReal and IsMouseLeaveReal functions
	checkStillHoveredTimer = new Timer(100, ()=>{
		const dom = GetDOM(this.root);
		if (dom == null) {
			this.checkStillHoveredTimer.Stop();
			return;
		}
		const mainRect = VRect.FromLTWH(dom.getBoundingClientRect());

		const leftBoxDOM = dom.querySelector(".NodeUI_LeftBox");
		const leftBoxRect = leftBoxDOM ? VRect.FromLTWH(leftBoxDOM.getBoundingClientRect()) : null;

		const bottomPanelDOM = dom.querySelector(".NodeUI_BottomPanel");
		const bottomPanelRect = bottomPanelDOM ? VRect.FromLTWH(bottomPanelDOM.getBoundingClientRect()) : null;

		const mouseRect = new VRect(mousePos, new Vector2(1, 1));
		const intersectsOne = !!(mouseRect.Intersects(mainRect) || (leftBoxRect && mouseRect.Intersects(leftBoxRect)) || (bottomPanelRect && mouseRect.Intersects(bottomPanelRect)));
		// Log(`Main: ${mainRect} Mouse:${mousePos} Intersects one?:${intersectsOne}`);
		this.SetState({hovered: intersectsOne});

		if (!intersectsOne) {
			this.checkStillHoveredTimer.Stop();
		}
	});

	render() {
		const {indexInNodeList, map, node, path, width, widthOverride, panelPosition, useLocalPanelState, style} = this.props;
		let {hovered, hoverPanel, hoverTermID, local_openPanel, lastWidthWhenNotPreview} = this.state;

		// connector part
		// ==========

		const nodeView = GetNodeView(map.id, path);
		//let sinceTime = GetTimeFromWhichToShowChangedNodes(map.id);
		let sinceTime = 0;
		/* let pathsToChangedNodes = GetPathsToNodesChangedSinceX(map._id, sinceTime);
		let ownNodeChanged = pathsToChangedNodes.Any(a=>a.split("/").Any(b=>b == node._id));
		let changeType = ownNodeChanged ? GetNodeChangeType(node, sinceTime) : null; */

		const lastAcknowledgementTime = GetLastAcknowledgementTime(node.id);
		sinceTime = sinceTime.KeepAtLeast(lastAcknowledgementTime);

		let changeType: ChangeType|n;
		if (node.createdAt > sinceTime) changeType = ChangeType.add;
		else if (node.current.createdAt > sinceTime) changeType = ChangeType.edit;

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

		const backgroundFillPercent = GetFillPercent_AtPath(ratingNode, ratingNodePath, null);
		const markerPercent = GetMarkerPercent_AtPath(ratingNode, ratingNodePath, null);

		const form = GetNodeForm(node, path);
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

		const nodeReversed = form == ClaimForm.negation;

		const leftPanelShow = nodeView?.selected || hovered; // || local_selected;
		const panelToShow = hoverPanel || local_openPanel || nodeView?.openPanel;
		const subPanelShow = node.type == MapNodeType.claim && (node.current.references || node.current.quote || node.current.media);
		const bottomPanelShow = leftPanelShow && panelToShow;
		let expanded = nodeView?.expanded ?? false;

		// const parentNodeView = GetNodeView(map.id, parentPath);
		// const parentNodeView = Watch(() => parentPath && GetNodeView_SelfOnly(map.id, parentPath), [map.id, parentPath]);
		const parentNodeView = GetNodeView(map.id, parentPath);
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
			/* if (useLocalPanelState) {
				this.SetState({local_selected: true});
				return;
			} */

			if (!nodeView?.selected) {
				ACTMapNodeSelect(map.id, path);
			}
		}, [map.id, nodeView, path]);
		const onDirectClick = UseCallback(e=>{
			RunInAction("NodeUI_Inner.onDirectClick", ()=>{
				if (combinedWithParentArgument && parent) {
					store.main.maps.nodeLastAcknowledgementTimes.set(parent.id, Date.now());
				}
				store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now());
			});
		}, [combinedWithParentArgument, node.id, parent]);
		const onTextHolderClick = UseCallback(e=>IsDoubleClick(e) && this.titlePanel && this.titlePanel.OnDoubleClick(), []);
		const toggleExpanded = UseCallback(e=>{
			/* let pathToApplyTo = path;
			// if collapsing subtree, and this node is premise of single-premise arg, start collapsing from parent (the argument node), so that its relevance args are collapsed as well
			if (expanded && e.altKey && combinedWithParentArgument) {
				pathToApplyTo = parentPath;
			}
			store.dispatch(new ACTMapNodeExpandedSet({ mapID: map.id, path: pathToApplyTo, expanded: !expanded, recursive: expanded && e.altKey })); */

			// if collapsing subtree, and this node is premise of single-premise arg, start collapsing from parent (the argument node), so that its relevance args are collapsed as well
			const recursivelyCollapsing = expanded && e.altKey;
			ACTMapNodeExpandedSet({mapID: map.id, path: combinedWithParentArgument ? parentPath! : path, expanded: !expanded, resetSubtree: recursivelyCollapsing});
			e.nativeEvent["ignore"] = true; // for some reason, "return false" isn't working
			// return false;
		}, [combinedWithParentArgument, expanded, map.id, parentPath, path]);

		const renderInner = (dragInfo?: DragInfo)=>{
			const asDragPreview = dragInfo?.snapshot.isDragging;
			// const offsetByAnotherDrag = dragInfo?.provided.draggableProps.style.transform;
			if (asDragPreview) {
				hovered = false;
				local_openPanel = null;
			}
			return (
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
					padding={GetPaddingForNode(node/*, isSubnode*/)}
					onClick={onClick}
					onDirectClick={onDirectClick}
					beforeChildren={<>
						{leftPanelShow &&
						<MapNodeUI_LeftBox {...{map, path, node, panelPosition, local_openPanel, backgroundColor}} asHover={hovered}
							onPanelButtonHover={panel=>this.SetState({hoverPanel: panel})}
							onPanelButtonClick={panel=>{
								if (useLocalPanelState) {
									this.SetState({local_openPanel: panel, hoverPanel: null});
									return;
								}

								RunInAction("NodeUI_Inner.onPanelButtonClick", ()=>{
									const nodeView_final = nodeView ?? GetNodeViewsAlongPath(map.id, path, true).Last();
									if (nodeView_final.openPanel != panel) {
										nodeView_final.VSet("openPanel", panel ?? DEL);
									} else {
										//delete nodeView_final.openPanel;
										nodeView_final.openPanel = undefined;
										this.SetState({hoverPanel: null});
									}
								});
							}}>
							{/* fixes click-gap */}
							{panelPosition == "below" && <div style={{position: "absolute", right: -1, width: 1, top: 0, bottom: 0}}/>}
						</MapNodeUI_LeftBox>}
						{/* fixes click-gap */}
						{leftPanelShow && panelPosition == "left" && <div style={{position: "absolute", right: "100%", width: 1, top: 0, bottom: 0}}/>}
					</>}
					onTextHolderClick={onTextHolderClick}
					text={<>
						<TitlePanel {...{indexInNodeList, parent: this, map, node, path}} {...dragInfo?.provided.dragHandleProps}
							ref={c=>this.titlePanel = c}
							style={E(GADDemo && {color: HSLA(222, 0.33, 0.25, 1), fontFamily: GADMainFont /*fontSize: 15, letterSpacing: 1*/})}/>
						{subPanelShow && <SubPanel node={node}/>}
						<NodeUI_Menu_Stub {...{map, node, path}} holderType={HolderType.generic}/>
					</>}
					{...E(
						{backgroundFillPercent, backgroundColor, markerPercent},
						GADDemo && {backgroundFillPercent: 100, backgroundColor: chroma(HSLA(0, 0, 1)) as Color},
					)}
					toggleExpanded={toggleExpanded}
					afterChildren={<>
						{bottomPanelShow
							&& <NodeUI_BottomPanel {...{map, node, path, parent, width, widthOverride, hovered, backgroundColor}}
								panelPosition={panelPosition!} panelToShow={panelToShow!}
								hoverTermID={hoverTermID} onTermHover={termID=>this.SetState({hoverTermID: termID})}/>}
						{reasonScoreValues && showReasonScoreValues
							&& <ReasonScoreValueMarkers {...{node, combinedWithParentArgument, reasonScoreValues}}/>}
					</>}
				/>
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
				draggableInfo: new DraggableInfo({nodePath: path, mapID: map.id}), // mapID needed for DND-completer to create the link command
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

@Observer
class NodeUI_BottomPanel extends BaseComponentPlus(
	{} as {
		map: Map, node: MapNodeL3, path: string, parent: MapNodeL3|n,
		width: number|n, widthOverride: number|n, panelPosition: "left" | "below", panelToShow: string, hovered: boolean, hoverTermID: string|n, onTermHover: (id: string)=>void,
		backgroundColor: chroma.Color,
	},
	{hoverTermID: null as string|n},
	) {
	panelsOpened = new Set();
	componentDidCatch(message, info) { EB_StoreError(this as any, message, info); }
	render() {
		if (this.state["error"]) return EB_ShowError(this.state["error"]);
		const {
			map, node, path, parent,
			width, widthOverride, panelPosition, panelToShow, hovered, hoverTermID, onTermHover,
			backgroundColor,
		} = this.props;
		const nodeView = GetNodeView(map.id, path);

		this.panelsOpened.add(panelToShow);
		const renderPanel = (panelName: string, uiFunc: (show: boolean)=>JSX.Element)=>{
			if (!this.panelsOpened.has(panelName)) return null;
			return uiFunc(panelToShow == panelName);
		};

		return (
			// <ErrorBoundary>
			<div className="NodeUI_BottomPanel" style={{
				position: "absolute", left: panelPosition == "below" ? 130 + 1 : 0, top: "calc(100% + 1px)",
				width: width ?? "100%", minWidth: (widthOverride ?? 0).KeepAtLeast(550), zIndex: hovered ? 6 : 5,
				padding: 5, background: backgroundColor.css(), borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
			}}>
				{GetValues(NodeRatingType).Contains(panelToShow) && (()=>{
					if (["impact", "relevance"].Contains(panelToShow) && node.type == MapNodeType.claim) {
						const argumentNode = NN(parent);
						const argumentPath = NN(SlicePath(path, 1));
						const ratings = GetRatings(argumentNode.id, panelToShow as NodeRatingType);
						return <RatingsPanel node={argumentNode} path={argumentPath} ratingType={panelToShow as NodeRatingType} ratings={ratings}/>;
					}
					const ratings = GetRatings(node.id, panelToShow as NodeRatingType);
					return <RatingsPanel node={node} path={path} ratingType={panelToShow as NodeRatingType} ratings={ratings}/>;
				})()}
				{renderPanel("definitions", show=><DefinitionsPanel ref={c=>this.definitionsPanel = c} {...{show, map, node, path, hoverTermID}}
						openTermID={nodeView?.openTermID}
						onHoverTerm={termID=>onTermHover(termID)}
						onClickTerm={termID=>RunInAction("NodeUI_Inner_onClickTerm", ()=>nodeView.openTermID = termID)}/>)}
				{/*renderPanel("phrasings", show=><PhrasingsPanel {...{show, node, path}}/>)*/}
				{renderPanel("discussion", show=><DiscussionPanel {...{show}}/>)}
				{renderPanel("social", show=><SocialPanel {...{show}}/>)}
				{renderPanel("tags", show=><TagsPanel {...{show, map, node, path}}/>)}
				{renderPanel("details", show=><DetailsPanel {...{show, map, node, path}}/>)}
				{renderPanel("history", show=><HistoryPanel {...{show, map, node, path}}/>)}
				{renderPanel("others", show=><OthersPanel {...{show, map, node, path}}/>)}
			</div>
		);
	}
	definitionsPanel: DefinitionsPanel|n;
}

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