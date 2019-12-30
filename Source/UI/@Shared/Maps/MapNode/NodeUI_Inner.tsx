import chroma from "chroma-js";
import classNames from "classnames";
import {DoNothing, Timer, ToJSON, Vector2i, VRect, WaitXThenRun, ToNumber, E} from "js-vextensions";
import {Draggable} from "react-beautiful-dnd";
import ReactDOM from "react-dom";
import {BaseComponent, BaseComponentPlus, GetDOM, UseCallback, UseEffect} from "react-vextensions";
import {ReasonScoreValues_RSPrefix, RS_CalculateTruthScore, RS_CalculateTruthScoreComposite, RS_GetAllValues} from "Store/firebase/nodeRatings/ReasonScore";
import {IsUserCreatorOrMod} from "Store/firebase/userExtras";
import {GADDemo} from "UI/@GAD/GAD";
import {DragInfo, EB_ShowError, EB_StoreError, HSLA, IsDoubleClick, Observer} from "vwebapp-framework";
import {DraggableInfo} from "Utils/UI/DNDStructures";
import {GetTimeFromWhichToShowChangedNodes, GetNodeRevealHighlightTime, GetTimeSinceNodeRevealedByPlayingTimeline} from "Store/main/maps/mapStates/$mapState";
import {GetPathNodeIDs, MapNodeView, ACTMapNodeSelect, ACTMapNodeExpandedSet, GetNodeView, GetNodeViewsAlongPath} from "Store/main/maps/mapViews/$mapView";
import {store} from "Store";
import {WeightingType} from "Store/main";
import {runInAction} from "mobx";
import {SlicePath} from "mobx-firelink";
import {GetLastAcknowledgementTime} from "Store/main/maps";
import {ChangeType, GetChangeTypeOutlineColor} from "../../../../Store/firebase/mapNodeEditTimes";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {GetFillPercent_AtPath, GetMarkerPercent_AtPath, GetNodeRatingsRoot, GetRatings} from "../../../../Store/firebase/nodeRatings";
import {RatingType, ratingTypes} from "../../../../Store/firebase/nodeRatings/@RatingType";
import {IsNodeSubnode, GetNodeID, GetNode} from "../../../../Store/firebase/nodes";
import {GetMainRatingType, GetNodeForm, GetNodeL3, GetPaddingForNode, IsPremiseOfSinglePremiseArgument} from "../../../../Store/firebase/nodes/$node";
import {ClaimForm, MapNodeL3} from "../../../../Store/firebase/nodes/@MapNode";
import {GetNodeColor, MapNodeType, MapNodeType_Info} from "../../../../Store/firebase/nodes/@MapNodeType";
import {MeID} from "../../../../Store/firebase/users";
import {ExpandableBox} from "./ExpandableBox";
import {DefinitionsPanel} from "./NodeUI/Panels/DefinitionsPanel";
import {DetailsPanel} from "./NodeUI/Panels/DetailsPanel";
import {DiscussionPanel} from "./NodeUI/Panels/DiscussionPanel";
import {HistoryPanel} from "./NodeUI/Panels/HistoryPanel";
import {OthersPanel} from "./NodeUI/Panels/OthersPanel";
import {PhrasingsPanel} from "./NodeUI/Panels/PhrasingsPanel";
import {RatingsPanel} from "./NodeUI/Panels/RatingsPanel";
import {SocialPanel} from "./NodeUI/Panels/SocialPanel";
import {TagsPanel} from "./NodeUI/Panels/TagsPanel";
import {SubPanel} from "./NodeUI_Inner/SubPanel";
import {TitlePanel} from "./NodeUI_Inner/TitlePanel";
import {MapNodeUI_LeftBox} from "./NodeUI_LeftBox";
import {NodeUI_Menu_Stub} from "./NodeUI_Menu";

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
	indexInNodeList: number, map: Map, node: MapNodeL3, path: string, width: number, widthOverride?: number,
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
	{hovered: false, hoverPanel: null as string, hoverTermID: null as string, local_openPanel: null as string, lastWidthWhenNotPreview: 0},
) {
	root: ExpandableBox;
	titlePanel: TitlePanel;

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

		const mouseRect = new VRect(mousePos, new Vector2i(1, 1));
		const intersectsOne = mouseRect.Intersects(mainRect) || (leftBoxRect && mouseRect.Intersects(leftBoxRect)) || (bottomPanelRect && mouseRect.Intersects(bottomPanelRect));
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

		const nodeView = GetNodeView(map._key, path);
		let sinceTime = GetTimeFromWhichToShowChangedNodes(map._key);
		/* let pathsToChangedNodes = GetPathsToNodesChangedSinceX(map._id, sinceTime);
		let ownNodeChanged = pathsToChangedNodes.Any(a=>a.split("/").Any(b=>b == node._id));
		let changeType = ownNodeChanged ? GetNodeChangeType(node, sinceTime) : null; */

		const lastAcknowledgementTime = GetLastAcknowledgementTime(node._key);
		sinceTime = sinceTime.KeepAtLeast(lastAcknowledgementTime);

		let changeType: ChangeType;
		if (node.createdAt > sinceTime) changeType = ChangeType.Add;
		else if (node.current.createdAt > sinceTime) changeType = ChangeType.Edit;

		const parentPath = SlicePath(path, 1);
		const parent = GetNodeL3(parentPath);
		const combinedWithParentArgument = IsPremiseOfSinglePremiseArgument(node, parent);

		let mainRatingType = GetMainRatingType(node);
		let ratingNode = node;
		let ratingNodePath = path;
		if (combinedWithParentArgument) {
			mainRatingType = "impact";
			ratingNode = parent;
			ratingNodePath = parentPath;
		}
		/* const mainRating_average = Watch(() => GetRatingAverage_AtPath(ratingNode, mainRatingType));
		// let mainRating_mine = GetRatingValue(ratingNode._id, mainRatingType, MeID());
		const mainRating_mine = Watch(() => GetRatingAverage_AtPath(ratingNode, mainRatingType, new RatingFilter({ includeUser: MeID() }))); */

		const useReasonScoreValuesForThisNode = store.main.maps.weighting == WeightingType.ReasonScore && (node.type == MapNodeType.Argument || node.type == MapNodeType.Claim);
		const reasonScoreValues = useReasonScoreValuesForThisNode && RS_GetAllValues(node._key, path, true) as ReasonScoreValues_RSPrefix;

		const backgroundFillPercent = GetFillPercent_AtPath(ratingNode, ratingNodePath, null);
		const markerPercent = GetMarkerPercent_AtPath(ratingNode, ratingNodePath, null);

		const form = GetNodeForm(node, path);
		const ratingsRoot = GetNodeRatingsRoot(node._key);
		const {showReasonScoreValues} = store.main.maps;

		/* const playingTimeline_currentStepRevealNodes = GetPlayingTimelineCurrentStepRevealNodes(map._key);
		let revealedByCurrentTimelineStep = playingTimeline_currentStepRevealNodes.Contains(path);
		if (combinedWithParentArgument) {
			revealedByCurrentTimelineStep = revealedByCurrentTimelineStep || playingTimeline_currentStepRevealNodes.Contains(parentPath);
		} */
		const nodeRevealHighlightTime = GetNodeRevealHighlightTime();
		const timeSinceRevealedByTimeline_self = GetTimeSinceNodeRevealedByPlayingTimeline(map._key, path, true, true);
		const timeSinceRevealedByTimeline_parent = GetTimeSinceNodeRevealedByPlayingTimeline(map._key, parentPath, true, true);
		let timeSinceRevealedByTimeline = timeSinceRevealedByTimeline_self;
		if (combinedWithParentArgument && timeSinceRevealedByTimeline_parent != null) {
			timeSinceRevealedByTimeline = timeSinceRevealedByTimeline != null ? Math.min(timeSinceRevealedByTimeline, timeSinceRevealedByTimeline_parent) : timeSinceRevealedByTimeline_parent;
		}

		// the rest
		// ==========

		UseEffect(()=>{
			/* const { dragInfo } = this.props;
			const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
			if (!asDragPreview && this.draggableDiv) { */
			// setDragActive(this.root.DOM.getBoundingClientRect().width);
			if (this.root && this.root.DOM) {
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

		// Log(`${node._key} -- ${dragInfo && dragInfo.snapshot.isDragging}; ${dragInfo && dragInfo.snapshot.draggingOver}`);

		if (combinedWithParentArgument) {
			backgroundColor = GetNodeColor(parent);
		}

		const outlineColor = GetChangeTypeOutlineColor(changeType);
		const barSize = 5;
		const pathNodeIDs = GetPathNodeIDs(path);
		const isSubnode = IsNodeSubnode(node);

		const nodeReversed = form == ClaimForm.Negation;

		const leftPanelShow = nodeView?.selected || hovered; // || local_selected;
		const panelToShow = hoverPanel || local_openPanel || nodeView?.openPanel;
		const subPanelShow = node.type == MapNodeType.Claim && (node.current.contentNode || node.current.image);
		const bottomPanelShow = leftPanelShow && panelToShow;
		let expanded = nodeView?.expanded ?? false;

		// const parentNodeView = GetNodeView(map._key, parentPath);
		// const parentNodeView = Watch(() => parentPath && GetNodeView_SelfOnly(map._key, parentPath), [map._key, parentPath]);
		const parentNodeView = GetNodeView(map._key, parentPath);
		// if combined with parent arg (ie. premise of single-premise arg), use parent's expansion state for this box
		if (combinedWithParentArgument) {
			expanded = parentNodeView?.expanded ?? false;
		}

		const onMouseEnter = UseCallback(()=>{
			this.SetState({hovered: true});
			this.checkStillHoveredTimer.Start();
		}, []);
		const onMouseLeave = UseCallback(()=>{
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
				ACTMapNodeSelect(map._key, path);
			}
		}, [map._key, nodeView, path]);
		const onDirectClick = UseCallback(e=>{
			runInAction("NodeUI_Inner.onDirectClick", ()=>{
				if (combinedWithParentArgument) {
					store.main.maps.nodeLastAcknowledgementTimes.set(parent && parent._key, Date.now());
				}
				store.main.maps.nodeLastAcknowledgementTimes.set(node._key, Date.now());
			});
		}, [combinedWithParentArgument, node._key, parent]);
		const onTextHolderClick = UseCallback(e=>IsDoubleClick(e) && this.titlePanel && this.titlePanel.OnDoubleClick(), []);
		const toggleExpanded = UseCallback(e=>{
			/* let pathToApplyTo = path;
			// if collapsing subtree, and this node is premise of single-premise arg, start collapsing from parent (the argument node), so that its relevance args are collapsed as well
			if (expanded && e.altKey && combinedWithParentArgument) {
				pathToApplyTo = parentPath;
			}
			store.dispatch(new ACTMapNodeExpandedSet({ mapID: map._key, path: pathToApplyTo, expanded: !expanded, recursive: expanded && e.altKey })); */

			// if collapsing subtree, and this node is premise of single-premise arg, start collapsing from parent (the argument node), so that its relevance args are collapsed as well
			const recursivelyCollapsing = expanded && e.altKey;
			ACTMapNodeExpandedSet({mapID: map._key, path: combinedWithParentArgument ? parentPath : path, expanded: !expanded, resetSubtree: recursivelyCollapsing});
			e.nativeEvent["ignore"] = true; // for some reason, "return false" isn't working
			// return false;
		}, [combinedWithParentArgument, expanded, map._key, parentPath, path]);

		const renderInner = dragInfo=>{
			const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
			// const offsetByAnotherDrag = dragInfo && dragInfo.provided.draggableProps.style.transform;
			if (asDragPreview) {
				hovered = false;
				local_openPanel = null;
			}
			return (
				<ExpandableBox ref={c=>DoNothing(dragInfo && dragInfo.provided.innerRef(GetDOM(c) as any), this.root = c)}
					{...{width, widthOverride, outlineColor, expanded}} parent={this}
					className={classNames("NodeUI_Inner", asDragPreview && "DragPreview", {root: pathNodeIDs.length == 0})}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
					{...(dragInfo && dragInfo.provided.draggableProps)} // {...(dragInfo && dragInfo.provided.dragHandleProps)} // drag-handle is attached to just the TitlePanel, below
					style={E(
						timeSinceRevealedByTimeline != null && timeSinceRevealedByTimeline <= nodeRevealHighlightTime &&
							{boxShadow: `rgba(255,255,0,${1 - (timeSinceRevealedByTimeline / nodeRevealHighlightTime)}) 0px 0px 7px, rgb(0, 0, 0) 0px 0px 2px`},
						style,
						dragInfo && dragInfo.provided.draggableProps.style,
						asDragPreview && {zIndex: 10},
					)}
					padding={GetPaddingForNode(node, isSubnode)}
					onClick={onClick}
					onDirectClick={onDirectClick}
					beforeChildren={<>
						{leftPanelShow &&
						<MapNodeUI_LeftBox {...{map, path, node, ratingsRoot, panelPosition, local_openPanel, backgroundColor}} asHover={hovered}
							onPanelButtonHover={panel=>this.SetState({hoverPanel: panel})}
							onPanelButtonClick={panel=>{
								if (useLocalPanelState) {
									this.SetState({local_openPanel: panel, hoverPanel: null});
									return;
								}

								runInAction("NodeUI_Inner.onPanelButtonClick", ()=>{
									let nodeView_final = nodeView;
									if (nodeView_final == null) nodeView_final = GetNodeViewsAlongPath(map._key, path, true).Last();
									if (nodeView_final.openPanel != panel) {
										nodeView_final.openPanel = panel;
									} else {
										nodeView_final.openPanel = null;
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
						<TitlePanel {...{indexInNodeList, parent: this, map, node, path}} {...(dragInfo && dragInfo.provided.dragHandleProps)}
							ref={c=>this.titlePanel = c}
							style={E(GADDemo && {color: HSLA(222, 0.33, 0.25, 1), fontFamily: "TypoPRO Bebas Neue", fontSize: 15, letterSpacing: 1})}/>
						{subPanelShow && <SubPanel node={node}/>}
						<NodeUI_Menu_Stub {...{map, node, path}}/>
					</>}
					{...E(
						{backgroundFillPercent, backgroundColor, markerPercent},
						GADDemo && {backgroundFillPercent: 100, backgroundColor: chroma(HSLA(0, 0, 1)) as Color},
					)}
					toggleExpanded={toggleExpanded}
					afterChildren={<>
						{bottomPanelShow
							&& <NodeUI_BottomPanel {...{map, node, path, parent, width, widthOverride, panelPosition, panelToShow, hovered, backgroundColor}}
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
				draggableInfo: new DraggableInfo({nodePath: path, mapID: map._key}), // mapID needed for DND-completer to create the link command
				index: indexInNodeList,
			};
		};
		const dndProps = GetDNDProps();
		if (dndProps == null) {
			return renderInner(null);
		}

		const draggableID = ToJSON(dndProps.draggableInfo);
		return (
			<>
				{/* <div>asDragPreview: {asDragPreview}</div> */}
				<Draggable type={dndProps.type} key={draggableID} draggableId={draggableID} index={dndProps.index}>
					{(provided, snapshot)=>{
						const dragInfo = {provided, snapshot};
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
		map: Map, node: MapNodeL3, path: string, parent: MapNodeL3,
		width: number, widthOverride: number, panelPosition: "left" | "below", panelToShow: string, hovered: boolean, hoverTermID: string, onTermHover: (id: string)=>void,
		backgroundColor: Color,
	},
	{hoverTermID: null as string},
	) {
	componentDidCatch(message, info) { EB_StoreError(this, message, info); }
	render() {
		if (this.state["error"]) return EB_ShowError(this.state["error"]);
		const {
			map, node, path, parent,
			width, widthOverride, panelPosition, panelToShow, hovered, hoverTermID, onTermHover,
			backgroundColor,
		} = this.props;
		const nodeView = GetNodeView(map._key, path);

		return (
			// <ErrorBoundary>
			<div className="NodeUI_BottomPanel" style={{
				position: "absolute", left: panelPosition == "below" ? 130 + 1 : 0, top: "calc(100% + 1px)",
				width, minWidth: (widthOverride | 0).KeepAtLeast(550), zIndex: hovered ? 6 : 5,
				padding: 5, background: backgroundColor.css(), borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
			}}>
				{ratingTypes.Contains(panelToShow) && (()=>{
					if (["impact", "relevance"].Contains(panelToShow) && node.type == MapNodeType.Claim) {
						const argumentNode = parent;
						const argumentPath = SlicePath(path, 1);
						const ratings = GetRatings(argumentNode._key, panelToShow as RatingType);
						return <RatingsPanel node={argumentNode} path={argumentPath} ratingType={panelToShow as RatingType} ratings={ratings}/>;
					}
					const ratings = GetRatings(node._key, panelToShow as RatingType);
					return <RatingsPanel node={node} path={path} ratingType={panelToShow as RatingType} ratings={ratings}/>;
				})()}
				{panelToShow == "definitions" &&
					<DefinitionsPanel ref={c=>this.definitionsPanel = c} {...{node, path, hoverTermID}}
						openTermID={nodeView?.openTermID}
						onHoverTerm={termID=>onTermHover(termID)}
						onClickTerm={termID=>runInAction("NodeUI_Inner_onClickTerm", ()=>nodeView.openTermID = termID)}/>}
				{panelToShow == "phrasings" && <PhrasingsPanel node={node} path={path}/>}
				{panelToShow == "discussion" && <DiscussionPanel/>}
				{panelToShow == "social" && <SocialPanel/>}
				{panelToShow == "tags" && <TagsPanel/>}
				{panelToShow == "details" && <DetailsPanel map={map} node={node} path={path}/>}
				{panelToShow == "history" && <HistoryPanel map={map} node={node} path={path}/>}
				{panelToShow == "others" && <OthersPanel map={map} node={node} path={path}/>}
			</div>
		);
	}
	definitionsPanel: DefinitionsPanel;
}

class ReasonScoreValueMarkers extends BaseComponent<{node: MapNodeL3, reasonScoreValues: ReasonScoreValues_RSPrefix, combinedWithParentArgument: boolean}, {}> {
	render() {
		const {node, reasonScoreValues, combinedWithParentArgument} = this.props;
		const mainScore = node.type == MapNodeType.Argument ? RS_CalculateTruthScoreComposite(node._key) : RS_CalculateTruthScore(node._key);
		const {rs_argTruthScoreComposite, rs_argWeightMultiplier, rs_argWeight, rs_claimTruthScore, rs_claimBaseWeight} = reasonScoreValues;
		return (
			<div className="clickThrough" style={{position: "absolute", top: "100%", width: "100%", zIndex: 1, textAlign: "center", fontSize: 14}}>
				{node.type == MapNodeType.Argument && `Truth score: ${mainScore.ToPercentStr()}${
					` Weight: [...]x${rs_argWeightMultiplier.RoundTo_Str(0.01)} = ${rs_argWeight.RoundTo_Str(0.01)}`
				}`}
				{node.type == MapNodeType.Claim && `Truth score: ${mainScore.ToPercentStr()}${
					combinedWithParentArgument
						? ` Weight: ${rs_claimBaseWeight.RoundTo_Str(0.01)}x${rs_argWeightMultiplier.RoundTo_Str(0.01)} = ${rs_argWeight.RoundTo_Str(0.01)}`
						: ""
				}`}
			</div>
		);
	}
}