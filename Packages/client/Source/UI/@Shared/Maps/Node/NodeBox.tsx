import {GetChangeTypeOutlineColor, GetNodeForm, GetNodeL3, GetPaddingForNode, GetPathNodeIDs, DMap, NodeL3, NodeType, NodeType_Info, NodeView, MeID, ReasonScoreValues_RSPrefix, RS_CalculateTruthScore, RS_CalculateTruthScoreComposite, RS_GetAllValues, ChildOrdering, GetSubPanelAttachments, GetToolbarItemsToShow, GetNodeSubscription, GetSubscriptionLevel, ShowNotification, PERMISSIONS} from "dm_common";
import React, {useCallback, useContext, useEffect, useReducer, useRef, useState} from "react";
import {store} from "Store";
import {GetNodeChangeType} from "Store/db_ext/mapNodeEdits.js";
import {GetNodeColor} from "Store/db_ext/nodes";
import {GetMapState, GetNodeRevealHighlightTime, GetTimeFromWhichToShowChangedNodes} from "Store/main/maps/mapStates/$mapState.js";
import {ACTNodeExpandedSet, ACTNodeSelect, GetNodeView, GetNodeViewsAlongPath} from "Store/main/maps/mapViews/$mapView.js";
import {SLMode, URL_HideNodeHover} from "UI/@SL/SL.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {DraggableInfo} from "Utils/UI/DNDStructures.js";
import {IsMouseEnterReal, IsMouseLeaveReal} from "Utils/UI/General.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {DragInfo, IsDoubleClick, RunInAction, RunInAction_Set, UseDocumentEventListener} from "web-vcore";
import {E, GetPercentFromXToY, Timer, ToJSON, Vector2, VRect, WaitXThenRun} from "js-vextensions";
import {SlicePath} from "mobx-graphlink";
import {Draggable} from "@hello-pangea/dnd";
import ReactDOM from "react-dom";
import {UseCallback} from "react-vextensions";
import {Graph, GraphContext} from "tree-grapher";
import {Row} from "react-vcomponents";
import {UseForcedExpandForPath} from "Store/main/maps.js";
import {AutoRun_HandleBail} from "Utils/AutoRuns/@Helpers.js";
import {GetClassForFrameRenderAtTime} from "UI/@Shared/Timelines/TimelinePanel/StepList/RecordDropdown.js";
import {GetPlaybackTimeSinceNodeRevealed} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {RunCommand_AddSubscriptionWithLevel} from "Utils/DB/Command.js";
import {NodeUI_BottomPanel} from "./DetailBoxes/NodeUI_BottomPanel.js";
import {NodeUI_LeftBox} from "./DetailBoxes/NodeUI_LeftBox.js";
import {ExpandableBox} from "./ExpandableBox.js";
import {NodeToolbar} from "./NodeBox/NodeToolbar.js";
import {SubPanel} from "./NodeBox/SubPanel.js";
import {TitlePanel, TitlePanelElement} from "./NodeBox/TitlePanel.js";
import {NodeUI_Menu_Stub} from "./NodeUI_Menu.js";
import {NodeNotificationControl} from "./NodeBox/NodeNotificationControl.js";
import {observer_mgl} from "mobx-graphlink";

export type NodeBox_Props = {
	indexInNodeList: number,
	node: NodeL3,
	path: string,
	treePath: string,
	map?: DMap,
	forLayoutHelper: boolean,
	forSubscriptionsPage?: boolean,
	width?: number|n,
	standardWidthInGroup?: number|n,
	backgroundFillPercentOverride?: number,
	panelsPosition?: "left" | "below",
	useLocalPanelState?: boolean,
	style?: React.CSSProperties,
	childrenShownByNodeExpandButton?: number,
	usePortalForDetailBoxes?: boolean,
} & {dragInfo?: DragInfo};

type State = {
	hovered: boolean,
	moreButtonHovered: boolean,
	leftPanelHovered: boolean,
	lastHoveredPanel: string|n,
	hoverTermIDs: string[]|n,
	lastWidthWhenNotPreview: number,
	showNotificationPanel: boolean,
};

export const NodeBox = observer_mgl((props: NodeBox_Props)=>{
	const {indexInNodeList, map, node, path, treePath, forLayoutHelper, forSubscriptionsPage, width, standardWidthInGroup,
		backgroundFillPercentOverride, panelsPosition, useLocalPanelState, style, usePortalForDetailBoxes, childrenShownByNodeExpandButton
	} = props;
	const [state, setState] = useState<State>({
		hovered: false,
		moreButtonHovered: false,
		leftPanelHovered: false,
		lastHoveredPanel: null,
		hoverTermIDs: null,
		lastWidthWhenNotPreview: 0,
		showNotificationPanel: false,
	});
	const {moreButtonHovered, leftPanelHovered, lastHoveredPanel, hoverTermIDs, lastWidthWhenNotPreview, showNotificationPanel} = state;
	let {hovered} = state;

	const [_, reRender] = useReducer(x=>x+1, 0);
	const rootRef = useRef<HTMLDivElement>(null);
	const leftPanelRef = useRef<HTMLDivElement>(null);
	const bottomPanelRef = useRef<HTMLElement>(null);
	const titlePanelRef = useRef<TitlePanelElement|n>(null);

	// TODO: replace this system by just using the new IsMouseEnterReal and IsMouseLeaveReal functions
	const checkStillHoveredTimer = useRef<Timer|n>(new Timer(100, ()=>{
		const dom = rootRef.current;

		if (dom == null) {
			checkStillHoveredTimer.current!.Stop();
			return;
		}
		const mainRect = VRect.FromLTWH(dom.getBoundingClientRect());

		const leftBoxDOM = leftPanelRef.current;
		const leftBoxRect = leftBoxDOM ? VRect.FromLTWH(leftBoxDOM.getBoundingClientRect()) : null;

		const bottomPanelDOM = bottomPanelRef.current;
		const bottomPanelRect = bottomPanelDOM ? VRect.FromLTWH(bottomPanelDOM.getBoundingClientRect()).NewTop(top=>top - 1) : null; // add 1px to top, for box-shadow outline

		const mouseRect = new VRect(mousePos, new Vector2(1, 1));
		const intersectsOne = !!(mouseRect.Intersects(mainRect) || (leftBoxRect && mouseRect.Intersects(leftBoxRect)) || (bottomPanelRect && mouseRect.Intersects(bottomPanelRect)));
		setState(prevState=>({
			...prevState,
			hovered: intersectsOne,
		}))

		if (!intersectsOne) {
			checkStillHoveredTimer.current?.Stop();
		}
	}));

	// ========== connector part ==========
	const [local_nodeView, setLocal_nodeView] = useState({} as NodeView);
	const nodeView = useLocalPanelState ? local_nodeView : GetNodeView(map?.id, path);
	const UpdateLocalNodeView = UseCallback((updates: Partial<NodeView>)=>{
		// rather than call setLocal_nodeView, mutate the existing object, then force-update; this way multiple
		// UpdateLocalNodeView calls in the same tick will succeed (eg. onClick and onPanelButtonClick)
		local_nodeView.VSet(updates);
		reRender();
	}, [local_nodeView]);

	const graph = useContext(GraphContext) as Graph|n;
	const sinceTime = GetTimeFromWhichToShowChangedNodes(map?.id);
	const changeType = GetNodeChangeType(node, sinceTime);
	const parentPath = SlicePath(path, 1);
	const parent = GetNodeL3(parentPath);
	const nodeForm = GetNodeForm(node, path);

	const useReasonScoreValuesForThisNode = store.main.maps.childOrdering == ChildOrdering.reasonScore && (node.type == NodeType.argument || node.type == NodeType.claim);
	const reasonScoreValues = useReasonScoreValuesForThisNode && RS_GetAllValues(node.id, path, true) as ReasonScoreValues_RSPrefix;
	const {showReasonScoreValues} = store.main.maps;

	const backgroundFillPercent = backgroundFillPercentOverride ?? 100;
	const markerPercent = null; // marker is too distracting to be enabled for-now/by-default

	// for css effects that are based on the playing-timeline's "current time", apply these directly/without-reactjs (react has too much overhead for updates that happen many times per second)
	//const playingTimeline = map ? GetPlayingTimeline(map.id) : null;
	useEffect(()=>{
		//if (playingTimeline == null) return;
		const dispose = AutoRun_HandleBail(()=>{
			const nodeRevealHighlightTime = GetNodeRevealHighlightTime();
			const timeSinceRevealedByTimeline_simplified = map ? GetPlaybackTimeSinceNodeRevealed(map.id, path, false, true) : null;
			const timeSinceRevealedByTimeline_precise = ()=>(map ? GetPlaybackTimeSinceNodeRevealed(map.id, path, false, false) : null);

			const boxStyle = rootRef.current?.style;
			if (boxStyle) {
				Object.assign(boxStyle, E(
					timeSinceRevealedByTimeline_simplified != null && timeSinceRevealedByTimeline_simplified <= nodeRevealHighlightTime ? {
						boxShadow: `rgba(255,255,0,${1 - (timeSinceRevealedByTimeline_simplified / nodeRevealHighlightTime)}) 0px 0px 7px, rgb(0, 0, 0) 0px 0px 2px`,
					} : {boxShadow: null},
					timeSinceRevealedByTimeline_simplified != null && timeSinceRevealedByTimeline_simplified.IsBetween(0, 1) && timeSinceRevealedByTimeline_precise() != null ? {
						clipPath: `inset(-30px calc(100% - ${GetPercentFromXToY(0, 1, timeSinceRevealedByTimeline_precise()!).ToPercentStr()}) 0px 0px)`,
					} : {clipPath: null},
				));
			}
		});
		return ()=>dispose();
	}, [map, path]);

	const mapState = GetMapState(map?.id);
	const uiState = store.main.notifications;

	// ==========the rest ==========

	useEffect(()=>{
		if (rootRef.current) {
			let renderedWidth = rootRef.current.getBoundingClientRect().width;
			// store the pre-zoomed width, because we use it for the space-keeper (outside of draggable), on top of which zoom already gets applied
			if (mapState != null && mapState?.zoomLevel != 1) {
				renderedWidth /= mapState.zoomLevel;
			}
			if (renderedWidth != lastWidthWhenNotPreview) {
				setState(prevState=>({
					...prevState,
					lastWidthWhenNotPreview: renderedWidth,
				}));
			}
		}
	})

	const nodeTypeInfo = NodeType_Info.for[node.type];
	const backgroundColor = GetNodeColor(node);

	let outlineColor = GetChangeTypeOutlineColor(changeType);
	let outlineThickness = 1;

	// in sl-mode, since node-background are white, we need to make these outlines more prominent
	if (SLMode && outlineColor != null) {
		//outlineColor = chroma.mix(outlineColor, "black", .5);
		outlineThickness = 4;
	}

	if (store.main.maps.screenshotMode) {
		outlineColor = null;
		outlineThickness = 0;
	}

	const barSize = 5;
	const pathNodeIDs = GetPathNodeIDs(path);
	const selected = nodeView?.selected || false;
	const leftPanelPinned = nodeView?.leftPanelPinned ?? false;
	const toolbarItemsToShow = GetToolbarItemsToShow(node, path, map);
	const toolbarShow = toolbarItemsToShow.length > 0;
	const toolbar_hasRightAnchoredItems = toolbarItemsToShow.filter(a=>a.panel != "prefix").length > 0;
	const panelToShow = (selected || hovered) ? ((leftPanelHovered && lastHoveredPanel) || nodeView?.openPanel || lastHoveredPanel) : undefined;
	const leftPanelShow = (leftPanelPinned || moreButtonHovered || leftPanelHovered || nodeView?.selected || hovered) && !URL_HideNodeHover;
	const attachments_forSubPanel = GetSubPanelAttachments(node.current);
	const subPanelShow = attachments_forSubPanel.length > 0;
	const bottomPanelShow = /*(selected || hovered) &&*/ panelToShow != null;
	let expanded = nodeView?.expanded ?? false;

	if (UseForcedExpandForPath(path, false)) expanded = true;

	const onMouseEnter = useCallback(e=>{
		if (!IsMouseEnterReal(e, rootRef.current!)) return;
		setState(prevState=>({
			...prevState,
			hovered: true,
		}));
		checkStillHoveredTimer.current?.Start();
	}, []);

	const onMouseLeave = UseCallback(e=>{
		if (!IsMouseLeaveReal(e, rootRef.current!)) return;
		setState(prevState=>({
			...prevState,
			hovered: false,
			// also clear last-hovered-panel
			lastHoveredPanel: null,
		}));
		checkStillHoveredTimer.current?.Stop();
	}, []);

	const onClick = useCallback(e=>{
		if ((e.nativeEvent as any).ignore) return;
		if (useLocalPanelState && !local_nodeView.selected) {
			UpdateLocalNodeView({selected: true});
			return;
		}

		// anchoring arguably not necessary, but can help when other people add/remove nodes while user is scrolling + clicking nodes (without expanding/collapsing)
		graph?.SetAnchorNode(treePath, {nodePath: path});
		if (!nodeView?.selected && map) {
			ACTNodeSelect(map.id, path);
		}
	}, [UpdateLocalNodeView, graph, local_nodeView.selected, map, nodeView?.selected, path, treePath, useLocalPanelState]);

	if (usePortalForDetailBoxes) {
		UseDocumentEventListener("click", e=>{
			const uiRoots = [rootRef.current, leftPanelRef.current, bottomPanelRef.current].filter(a=>a);
			// if user clicked outside of node-ui-inner's descendant tree, close the detail-boxes
			if (uiRoots.every(a=>!a!.contains(e.target as HTMLElement))) {
				UpdateLocalNodeView({selected: undefined, openPanel: undefined, leftPanelPinned: undefined});
			}
		});
	}
	const onDirectClick = useCallback(e=>{
		RunInAction("NodeBox.onDirectClick", ()=>{
			store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now());
		});
	}, [node.id]);

	const onTextCompClick = UseCallback(e=>IsDoubleClick(e) && titlePanelRef.current && titlePanelRef.current.onDoubleClick(), []);
	const toggleExpanded = UseCallback(e=>{
		const newExpanded = !expanded;
		const recursivelyCollapsing = newExpanded == false && e.altKey;
		graph?.SetAnchorNode(treePath, {nodePath: path});
		ACTNodeExpandedSet({mapID: map?.id, path, expanded: newExpanded, resetSubtree: recursivelyCollapsing});

		e.nativeEvent["ignore"] = true; // for some reason, "return false" isn't working
		//return false;
	}, [expanded, graph, map?.id, path, treePath]);

	const onPanelButtonClick = (panel: string, source: "toolbar" | "left-panel" | "bottom-panel-click")=>{
		/*if (useLocalPanelState) {
			UpdateLocalNodeView({openPanel: undefined});
			this.SetState({hoverPanel: null});
			return;
		}*/

		RunInAction("NodeBox.onPanelButtonClick", ()=>{
			const nodeView_final = nodeView ?? GetNodeViewsAlongPath(map?.id, path, true).Last();

			// if clicking on a not-currently open panel, set panel to that; else, must be clicking on currently-open panel, so clear
			const newPanel = panel != nodeView_final.openPanel ? panel : undefined;
			if (newPanel == null && source == "bottom-panel-click") return; // bottom-panel-click should never *unshow* the currently-shown panel
			nodeView_final.openPanel = newPanel;

			//nodeView_final.VSet("leftPanelPinned", source == "left-panel" && newPanel != null ? true : DEL);
			nodeView_final.leftPanelPinned = source == "left-panel" && newPanel != null ? true : undefined;

			if (newPanel == null) {
				setState(prevState=>({
					...prevState,
					lastHoveredPanel: null,
				}))
			}

			// if using local-panel-state, manually trigger update at end (since mobx not activated for the local-node-view object)
			if (useLocalPanelState) reRender();
		});
	};

	const subscription = GetNodeSubscription(MeID()!, node.id);
	const subscriptionLevel = GetSubscriptionLevel(subscription);

	const showNotificationButton = ShowNotification(node.type);
	const showNotificationPaint = showNotificationButton && (mapState?.subscriptionPaintMode ?? false);
	let showNotificationPaintCss = "none";
	if (showNotificationPaint) {
		if (subscriptionLevel == "all") {
			showNotificationPaintCss = "1px solid green";
		} else if (subscriptionLevel == "partial") {
			showNotificationPaintCss = "1px solid yellow";
		} else if (subscriptionLevel == "none") {
			showNotificationPaintCss = "none";
		}
	}

	UseDocumentEventListener("click", e=>{
		// if user clicked outside of node-box, close the subscription-level dropdown
		if (!e.composedPath().includes(rootRef.current as any)) {
			setState(prevState=>({
				...prevState,
				showNotificationPanel: false,
			}));
		}
	});

	UseDocumentEventListener("mouseup", e=>{
		uiState.paintMode_painting = false;
	});

	UseDocumentEventListener("mousedown", e=>{
		uiState.paintMode_painting = true;
	});

	const RenderInner = (dragInfo?: DragInfo)=>{
		const asDragPreview = dragInfo?.snapshot.isDragging;
		if (asDragPreview) {
			hovered = false;
			//local_openPanel = null; // todo: reimplement equivalent (if still needed)
		}

		// if argument, we don't care about matching width with peers (since its box is bumped up against that of its first premise)
		let width_final = (node.type != NodeType.argument ? standardWidthInGroup : null) ?? width ?? NodeType_Info.for[node.type].minWidth;
		width_final = width_final.KeepAtLeast(NodeType_Info.for[node.type].minWidth);

		const titlePanel = (
			<TitlePanel
				{...{indexInNodeList, parent: this, map, node, path}}
				dragHandleProps={dragInfo?.provided.dragHandleProps}
				ref={titlePanelRef}
				setParentState={(newState: Partial<State>)=>setState(prevState=>({...prevState, ...newState}))}
				style={{padding: GetPaddingForNode(node)}}
			/>
		);

		const toolbarElement = toolbarShow &&
			<NodeToolbar
				{...props}
				backgroundColor={backgroundColor}
				panelToShow={panelToShow}
				onPanelButtonClick={panel=>onPanelButtonClick(panel, "toolbar")}
				nodeUI_width_final={width_final}
				leftPanelShow={leftPanelShow}
				onMoreClick={()=>{
					RunInAction_Set(()=>{
						if (nodeView == null) return;
						nodeView.leftPanelPinned = !nodeView.leftPanelPinned;
					});
				}}
				onMoreHoverChange={v=>{
					setState(prevState=>({
						...prevState,
						moreButtonHovered: v,
					}));
				}}
			/>;

		const toolbarAndTitleElements = <>
			{!toolbarShow && titlePanel}
			{/* for arguments, we render the toolbar after the title, because it is an "inline toolbar" that is rendered right-of-title on the same row */}
			{toolbarShow && node.type == NodeType.argument && <Row>{titlePanel}{toolbarElement}</Row>}
			{toolbarShow && node.type != NodeType.argument && <>{toolbarElement}{titlePanel}</>}
		</>;

		const textElements = <>
			{toolbarAndTitleElements}
			{subPanelShow && <SubPanel node={node} toolbarShowing={toolbarShow}/>}
			<NodeUI_Menu_Stub {...{map, node, path}} delayEventHandler={!usePortalForDetailBoxes}/>
		</>;

		const beforeChildrenElements = <>
			{ leftPanelShow &&
				<NodeUI_LeftBox {...{map, path, node, panelsPosition, backgroundColor}}
					local_nodeView={useLocalPanelState ? local_nodeView : null} asHover={hovered}
					ref={leftPanelRef}
					usePortal={usePortalForDetailBoxes}
					nodeUIRef={rootRef}
					onPanelButtonHover={panel=>{
						// ignore unhovers
						if (panel) setState(prevState=>({...prevState, lastHoveredPanel: panel}));
					}}
					onPanelButtonClick={panel=>onPanelButtonClick(panel, "left-panel")}
					onHoverChange={v=>setState(prevState=>({...prevState, leftPanelHovered: v}))}
				>
					{/* fixes click-gap */}
					{panelsPosition == "below" && <div style={{position: "absolute", right: -1, width: 1, top: 0, bottom: 0}}/>}
				</NodeUI_LeftBox>
			}
			{showNotificationPanel && <NodeNotificationControl {...{node, backgroundColor, subscriptionLevel}}/>}
		</>

		const afterChildrenElements = <>
			{
				bottomPanelShow &&
				<NodeUI_BottomPanel {...{map, node, path, parent, width: width_final, minWidth: standardWidthInGroup, hovered, backgroundColor}}
					ref={c=>{
						bottomPanelRef.current = c
					}}
					nodeUIRef={rootRef}
					usePortal={usePortalForDetailBoxes}
					onClick={()=>onPanelButtonClick(panelToShow, "bottom-panel-click")}
					panelsPosition={panelsPosition!}
					panelToShow={panelToShow!}
					hoverTermIDs={hoverTermIDs}
					onTermHover={termIDs=>{
						setState(prevState=>({
							...prevState,
							hoverTermIDs: termIDs,
						}));
					}}
				/>
			}
			{reasonScoreValues && showReasonScoreValues && <ReasonScoreValueMarkers {...{node, reasonScoreValues}}/>}
		</>;

		const isShowingToolbarButtonAtTopLeft = toolbarItemsToShow.Any(a=>a.panel == "prefix");

		const onToggleNotifications = ()=>{
			setState(prevState=>({
				...prevState,
				showNotificationPanel: !prevState.showNotificationPanel,
			}));
		}

		const handleRef = useCallback((c: HTMLDivElement)=>{
			dragInfo?.provided.innerRef(c);
			rootRef.current = c;
		}, [dragInfo?.provided]);

		return (
			<>
				<ExpandableBox
					{...{
						outlineColor, outlineThickness, expanded,
						backgroundFillPercent: SLMode ? 100 : backgroundFillPercent,
						backgroundColor, markerPercent,
						width: width_final,
					}}
					showNotificationButton={showNotificationButton && !forSubscriptionsPage}
					notificationLevel={subscriptionLevel}
					onToggleNotifications={onToggleNotifications}
					ref={handleRef}
					className={
						[
							"NodeBox", "useLightText",
							asDragPreview && "DragPreview",
							pathNodeIDs.length == 0 && "root",
						].filter(a=>a).join(" ")
					}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
					{...dragInfo?.provided.draggableProps} // drag-handle is attached to just the TitlePanel, above
					style={E(
						{
							color: liveSkin.NodeTextColor().css(),
							//margin: "5px 0", // disabled temporarily, while debugging tree-grapher layout issues
							//minHeight: 25, // so that argument nodes remain 25px high, even when toolbar is hidden
						},
						style,
						dragInfo?.provided.draggableProps.style,
						asDragPreview && {zIndex: zIndexes.draggable},
						//outerNode.link._mirrorLink && {border: `solid ${HSLA(0, 0, 1, .3)}`, borderWidth: "0 0 0 1px"}, // if mirror-child, show white border at left
					)}
					padding={0}
					roundedTopLeftCorner={!isShowingToolbarButtonAtTopLeft}
					onClick={onClick}
					onDirectClick={onDirectClick}
					beforeChildren={beforeChildrenElements}
					text={textElements}
					toggleExpanded={toggleExpanded}
					expandButtonStyle={E(toolbar_hasRightAnchoredItems && {borderRadius: "0 0 5px 0"})}
					isExpandButtonForNodeChildren={(childrenShownByNodeExpandButton ?? 0) > 0}
					afterChildren={afterChildrenElements}
				/>
				{showNotificationPaint && <div
					onMouseDown={()=>{
						uiState.paintMode_painting = true;
						if (subscriptionLevel != uiState.paintMode_notificationLevel) {
							RunCommand_AddSubscriptionWithLevel({node: node.id, level: uiState.paintMode_notificationLevel});
						}
					}}
					onMouseEnter={()=>{
						if (uiState.paintMode_painting && subscriptionLevel != uiState.paintMode_notificationLevel) {
							RunCommand_AddSubscriptionWithLevel({node: node.id, level: uiState.paintMode_notificationLevel});
						}
					}}
					style={{
						borderRadius: "6px",
						position: "absolute", width: width_final + 1, right: -1, top: -1, bottom: -1,
						zIndex: 4,
						border: showNotificationPaintCss,
					}}/>
				}
				<div style={{width: lastWidthWhenNotPreview}}/>
				<FrameRenderSignal map={map}/>
			</>
		);
	}

	const GetDNDProps = ()=>{
		if (forLayoutHelper) return null; // don't make draggable if part of layout-helper map (just extra overhead; and glitches atm, probably cause `forLayoutHelper` val isn't in DraggableInfo struct)
		if (!PERMISSIONS.Node.Modify(MeID(), node)) return null;
		if (!path.includes("/")) return null; // don't make draggable if root-node of map
		return {
			type: "NodeL1",
			draggableInfo: new DraggableInfo({nodePath: path, mapID: map?.id}), // mapID needed for DND-completer to create the link command
			index: indexInNodeList,
		};
	};
	const dndProps = GetDNDProps();
	if (dndProps == null) {
		return RenderInner();
	}

	const draggableID = ToJSON(dndProps.draggableInfo);
	const renderInner_tracker1 = RenderInner(); // always call renderInner once here "outside of Draggable's conditional rendering", so that mobx-accesses are always tracked by this outer observer-component
	return (
		<>
			<Draggable  key={draggableID} draggableId={draggableID} index={dndProps.index}>
				{(provided, snapshot)=>{
					const dragInfo: DragInfo = {provided, snapshot};
					const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;

					// if drag preview, we have to put in portal, since otherwise the "filter" effect of ancestors causes the {position:fixed} style to not be relative-to-page
					if (asDragPreview) return ReactDOM.createPortal(RenderInner(dragInfo), portal);
					return RenderInner(dragInfo);
				}}
			</Draggable>
		</>
	);
})

let portal: HTMLElement;
WaitXThenRun(0, ()=>{
	portal = document.createElement("div");
	portal.id = "portalForDragging_NodeBox";
	document.body.appendChild(portal);
});

const ReasonScoreValueMarkers = (props: {node: NodeL3, reasonScoreValues: ReasonScoreValues_RSPrefix})=>{
	const {node, reasonScoreValues} = props;
	const mainScore = node.type == NodeType.argument ? RS_CalculateTruthScoreComposite(node.id) : RS_CalculateTruthScore(node.id);
	const {rs_argWeightMultiplier, rs_argWeight} = reasonScoreValues;

	return (
		<div className="clickThrough" style={{position: "absolute", top: "100%", width: "100%", zIndex: 1, textAlign: "center", fontSize: 14}}>
			{node.type == NodeType.argument && `Truth score: ${mainScore.ToPercentStr()}${
				` Weight: [...]x${rs_argWeightMultiplier.RoundTo_Str(0.01)} = ${rs_argWeight.RoundTo_Str(0.01)}`
			}`}
			{node.type == NodeType.claim && `Truth score: ${mainScore.ToPercentStr()}`}
		</div>
	);
}

/**
 * This is a helper component, used to signify to the timeline frame-renderer system when react has completed rendering of the component tree to reflect the new current-time. (see RecordDropdown.tsx)
 * (this is better than putting the access of mapState.playingTimeline_time in NodeBox directly, since that would cause unnecessary processing of other data during each re-render)
 */
export const FrameRenderSignal = observer_mgl(({map}: {map: DMap|n})=>{
	const timelinesState = store.main.timelines;
	const mapState = map ? GetMapState(map.id) : null;
	return (
		<div className={
			(
				timelinesState.recordPanel.recording && mapState?.playingTimeline_time != null ? [
					"forFrameRender",
					GetClassForFrameRenderAtTime(mapState.playingTimeline_time),
				] : []
			).filter(a=>a).join(" ")
		}/>
	);
})

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

/* @MakeDraggable(({ node, path, indexInNodeList }: TitlePanelProps) => {
	if (!path.includes('/')) return null; // don't make draggable if root-node of map
	return {
		type: 'NodeL1',
		draggableInfo: new DraggableInfo({ nodePath: path }),
		index: indexInNodeList,
	};
}) */

//            // @ExpensiveComponent
//            @Observer
//            export class NodeBox extends BaseComponentPlus(
//            	{panelsPosition: "left"} as NodeBox_Props,
//            	{
//            		hovered: false, moreButtonHovered: false, leftPanelHovered: false,
//            		lastHoveredPanel: null as string|n, hoverTermIDs: null as string[]|n, lastWidthWhenNotPreview: 0,
//            		showNotificationPanel: false,
//            	},
//            ) {
//            	root: ExpandableBox|n;
//            	titlePanel: TitlePanel|n;
//            	leftPanel: NodeUI_LeftBox|n;
//            	bottomPanel: NodeUI_BottomPanel|n;
//
//            	// todo: replace this system by just using the new IsMouseEnterReal and IsMouseLeaveReal functions
//            	checkStillHoveredTimer = new Timer(100, ()=>{
//            		const dom = GetDOM(this.root);
//            		if (dom == null) {
//            			this.checkStillHoveredTimer.Stop();
//            			return;
//            		}
//            		const mainRect = VRect.FromLTWH(dom.getBoundingClientRect());
//
//            		//const leftBoxDOM = dom.querySelector(".NodeUI_LeftBox");
//            		const leftBoxDOM = this.leftPanel?.DOM;
//            		const leftBoxRect = leftBoxDOM ? VRect.FromLTWH(leftBoxDOM.getBoundingClientRect()) : null;
//
//            		//const bottomPanelDOM = dom.querySelector(".NodeUI_BottomPanel");
//            		const bottomPanelDOM = this.bottomPanel?.DOM;
//            		const bottomPanelRect = bottomPanelDOM ? VRect.FromLTWH(bottomPanelDOM.getBoundingClientRect()).NewTop(top=>top - 1) : null; // add 1px to top, for box-shadow outline
//
//            		const mouseRect = new VRect(mousePos, new Vector2(1, 1));
//            		const intersectsOne = !!(mouseRect.Intersects(mainRect) || (leftBoxRect && mouseRect.Intersects(leftBoxRect)) || (bottomPanelRect && mouseRect.Intersects(bottomPanelRect)));
//            		// Log(`Main: ${mainRect} Mouse:${mousePos} Intersects one?:${intersectsOne}`);
//            		this.SetState({hovered: intersectsOne});
//
//            		if (!intersectsOne) {
//            			this.checkStillHoveredTimer.Stop();
//            		}
//            	});
//
//            	render() {
//            		const {indexInNodeList, map, node, path, treePath, forLayoutHelper, forSubscriptionsPage, width, standardWidthInGroup, backgroundFillPercentOverride, panelsPosition, useLocalPanelState, style, usePortalForDetailBoxes, childrenShownByNodeExpandButton} = this.props;
//            		let {hovered, moreButtonHovered, leftPanelHovered, lastHoveredPanel, hoverTermIDs, lastWidthWhenNotPreview, showNotificationPanel} = this.state;
//
//            		// connector part
//            		// ==========
//
//            		const [local_nodeView, setLocal_nodeView] = useState({} as NodeView);
//            		const nodeView = useLocalPanelState ? local_nodeView : GetNodeView(map?.id, path);
//            		const UpdateLocalNodeView = UseCallback((updates: Partial<NodeView>)=>{
//            			//setLocal_nodeView({...local_nodeView, ...updates});
//            			// rather than call setLocal_nodeView, mutate the existing object, then force-update; this way multiple UpdateLocalNodeView calls in the same tick will succeed (eg. onClick and onPanelButtonClick)
//            			local_nodeView.VSet(updates);
//            			this.Update();
//            		}, [local_nodeView]);
//
//            		const graph = useContext(GraphContext) as Graph|n;
//            		//const group = graph.groupsByPath.get(treePath);
//
//            		const sinceTime = GetTimeFromWhichToShowChangedNodes(map?.id);
//            		/*let pathsToChangedNodes = GetPathsToNodesChangedSinceX(map._id, sinceTime);
//            		let ownNodeChanged = pathsToChangedNodes.Any(a=>a.split("/").Any(b=>b == node._id));
//            		let changeType = ownNodeChanged ? GetNodeChangeType(node, sinceTime) : null;*/
//            		const changeType = GetNodeChangeType(node, sinceTime);
//
//            		const parentPath = SlicePath(path, 1);
//            		const parent = GetNodeL3(parentPath);
//
//            		const useReasonScoreValuesForThisNode = store.main.maps.childOrdering == ChildOrdering.reasonScore && (node.type == NodeType.argument || node.type == NodeType.claim);
//            		const reasonScoreValues = useReasonScoreValuesForThisNode && RS_GetAllValues(node.id, path, true) as ReasonScoreValues_RSPrefix;
//
//            		//const backgroundFillPercent = backgroundFillPercentOverride ?? GetFillPercent_AtPath(ratingNode, ratingNodePath, null);
//            		const backgroundFillPercent = backgroundFillPercentOverride ?? 100;
//            		//const markerPercent = GetMarkerPercent_AtPath(ratingNode, ratingNodePath, null);
//            		const markerPercent = null; // marker is too distracting to be enabled for-now/by-default
//
//            		const nodeForm = GetNodeForm(node, path);
//            		//const phrasings = GetNodePhrasings(node.id);
//            		const {showReasonScoreValues} = store.main.maps;
//
//            		// for css effects that are based on the playing-timeline's "current time", apply these directly/without-reactjs (react has too much overhead for updates that happen many times per second)
//            		//const playingTimeline = map ? GetPlayingTimeline(map.id) : null;
//            		UseEffect(()=>{
//            			//if (playingTimeline == null) return;
//            			const dispose = AutoRun_HandleBail(()=>{
//            				const nodeRevealHighlightTime = GetNodeRevealHighlightTime();
//            				const timeSinceRevealedByTimeline_simplified = map ? GetPlaybackTimeSinceNodeRevealed(map.id, path, false, true) : null;
//            				const timeSinceRevealedByTimeline_precise = ()=>(map ? GetPlaybackTimeSinceNodeRevealed(map.id, path, false, false) : null);
//
//            				const boxStyle = this.root?.DOM_HTML?.style;
//            				if (boxStyle) {
//            					Object.assign(boxStyle, E(
//            						timeSinceRevealedByTimeline_simplified != null && timeSinceRevealedByTimeline_simplified <= nodeRevealHighlightTime ? {
//            							boxShadow: `rgba(255,255,0,${1 - (timeSinceRevealedByTimeline_simplified / nodeRevealHighlightTime)}) 0px 0px 7px, rgb(0, 0, 0) 0px 0px 2px`,
//            						} : {boxShadow: null},
//            						timeSinceRevealedByTimeline_simplified != null && timeSinceRevealedByTimeline_simplified.IsBetween(0, 1) && timeSinceRevealedByTimeline_precise() != null ? {
//            							clipPath: `inset(-30px calc(100% - ${GetPercentFromXToY(0, 1, timeSinceRevealedByTimeline_precise()!).ToPercentStr()}) 0px 0px)`,
//            						} : {clipPath: null},
//            					));
//            				}
//            			});
//            			return ()=>dispose();
//            		}, [map, path]);
//
//            		const mapState = GetMapState(map?.id);
//            		const uiState = store.main.notifications;
//
//            		// the rest
//            		// ==========
//
//            		UseEffect(()=>{
//            			/* const { dragInfo } = this.props;
//            			const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
//            			if (!asDragPreview && this.draggableDiv) { */
//            			// setDragActive(this.root.DOM.getBoundingClientRect().width);
//            			if (this.root?.DOM) {
//            				let renderedWidth = this.root.DOM.getBoundingClientRect().width;
//            				// store the pre-zoomed width, because we use it for the space-keeper (outside of draggable), on top of which zoom already gets applied
//            				if (mapState != null && mapState?.zoomLevel != 1) {
//            					renderedWidth /= mapState.zoomLevel;
//            				}
//            				if (renderedWidth != lastWidthWhenNotPreview) {
//            					this.SetState({lastWidthWhenNotPreview: renderedWidth});
//            				}
//            			}
//            		});
//
//            		const nodeTypeInfo = NodeType_Info.for[node.type];
//            		const backgroundColor = GetNodeColor(node);
//            		/* const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
//            		// const offsetByAnotherDrag = dragInfo && dragInfo.provided.draggableProps.style.transform;
//            		if (asDragPreview) {
//            			hovered = false;
//            			local_openPanel = null;
//            		} */
//
//            		let outlineColor = GetChangeTypeOutlineColor(changeType);
//            		let outlineThickness = 1;
//            		// in sl-mode, since node-background are white, we need to make these outlines more prominent
//            		if (SLMode && outlineColor != null) {
//            			//outlineColor = chroma.mix(outlineColor, "black", .5);
//            			outlineThickness = 4;
//            		}
//            		if (store.main.maps.screenshotMode) {
//            			outlineColor = null;
//            			outlineThickness = 0;
//            		}
//
//            		const barSize = 5;
//            		const pathNodeIDs = GetPathNodeIDs(path);
//            		//const isSubnode = IsNodeSubnode(node);
//
//            		const selected = nodeView?.selected || false;
//            		const leftPanelPinned = nodeView?.leftPanelPinned ?? false;
//            		/*const [leftPanelPinned, setLeftPanelPinned] = useState(false);
//            		useEffect(()=>{
//            			// if left-panel is pinned, but node is no longer selected or hovered, reset its "pinned" state to false
//            			if (leftPanelPinned && !(selected || hovered)) setLeftPanelPinned(false);
//            		}, [selected, leftPanelPinned]);*/
//
//            		const toolbarItemsToShow = GetToolbarItemsToShow(node, path, map);
//            		const toolbarShow = toolbarItemsToShow.length > 0;
//            		const toolbar_hasRightAnchoredItems = toolbarItemsToShow.filter(a=>a.panel != "prefix").length > 0;
//            		const panelToShow = (selected || hovered) ? ((leftPanelHovered && lastHoveredPanel) || nodeView?.openPanel || lastHoveredPanel) : undefined;
//            		const leftPanelShow = (leftPanelPinned || moreButtonHovered || leftPanelHovered || nodeView?.selected || hovered) && !URL_HideNodeHover;
//            		const attachments_forSubPanel = GetSubPanelAttachments(node.current);
//            		const subPanelShow = attachments_forSubPanel.length > 0;
//            		const bottomPanelShow = /*(selected || hovered) &&*/ panelToShow != null;
//            		let expanded = nodeView?.expanded ?? false;
//            		// passing forLayoutHelperMap=false is fine here (our usage here only affects the node's display, and the layout-helper-map is only used for layout purposes)
//            		if (UseForcedExpandForPath(path, false)) expanded = true;
//
//            		const onMouseEnter = UseCallback(e=>{
//            			if (!IsMouseEnterReal(e, this.DOM_HTML)) return;
//            			this.SetState({hovered: true});
//            			this.checkStillHoveredTimer.Start();
//            		}, []);
//            		const onMouseLeave = UseCallback(e=>{
//            			if (!IsMouseLeaveReal(e, this.DOM_HTML)) return;
//            			this.SetState({
//            				hovered: false,
//            				// also clear last-hovered-panel
//            				lastHoveredPanel: null,
//            			});
//            			this.checkStillHoveredTimer.Stop();
//            		}, []);
//            		const onClick = UseCallback(e=>{
//            			if ((e.nativeEvent as any).ignore) return;
//            			if (useLocalPanelState && !local_nodeView.selected) {
//            				UpdateLocalNodeView({selected: true});
//            				return;
//            			}
//
//            			// anchoring arguably not necessary, but can help when other people add/remove nodes while user is scrolling + clicking nodes (without expanding/collapsing)
//            			graph?.SetAnchorNode(treePath, {nodePath: path});
//            			if (!nodeView?.selected && map) {
//            				ACTNodeSelect(map.id, path);
//            			}
//            		}, [UpdateLocalNodeView, graph, local_nodeView.selected, map, nodeView?.selected, path, treePath, useLocalPanelState]);
//            		if (usePortalForDetailBoxes) {
//            			UseDocumentEventListener("click", e=>{
//            				const uiRoots = [this.root?.DOM, this.leftPanel?.DOM, this.bottomPanel?.DOM].filter(a=>a);
//            				// if user clicked outside of node-ui-inner's descendant tree, close the detail-boxes
//            				if (uiRoots.every(a=>!a!.contains(e.target as HTMLElement))) {
//            					UpdateLocalNodeView({selected: undefined, openPanel: undefined, leftPanelPinned: undefined});
//            				}
//            			});
//            		}
//            		const onDirectClick = UseCallback(e=>{
//            			RunInAction("NodeBox.onDirectClick", ()=>{
//            				store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now());
//            			});
//            		}, [node.id]);
//            		const onTextCompClick = UseCallback(e=>IsDoubleClick(e) && this.titlePanel && this.titlePanel.OnDoubleClick(), []);
//            		const toggleExpanded = UseCallback(e=>{
//            			const newExpanded = !expanded;
//            			const recursivelyCollapsing = newExpanded == false && e.altKey;
//            			graph?.SetAnchorNode(treePath, {nodePath: path});
//            			ACTNodeExpandedSet({mapID: map?.id, path, expanded: newExpanded, resetSubtree: recursivelyCollapsing});
//
//            			e.nativeEvent["ignore"] = true; // for some reason, "return false" isn't working
//            			//return false;
//            		}, [expanded, graph, map?.id, path, treePath]);
//
//            		const onPanelButtonClick = (panel: string, source: "toolbar" | "left-panel" | "bottom-panel-click")=>{
//            			/*if (useLocalPanelState) {
//            				UpdateLocalNodeView({openPanel: undefined});
//            				this.SetState({hoverPanel: null});
//            				return;
//            			}*/
//
//            			RunInAction("NodeBox.onPanelButtonClick", ()=>{
//            				const nodeView_final = nodeView ?? GetNodeViewsAlongPath(map?.id, path, true).Last();
//
//            				// if clicking on a not-currently open panel, set panel to that; else, must be clicking on currently-open panel, so clear
//            				const newPanel = panel != nodeView_final.openPanel ? panel : undefined;
//            				if (newPanel == null && source == "bottom-panel-click") return; // bottom-panel-click should never *unshow* the currently-shown panel
//            				nodeView_final.openPanel = newPanel;
//
//            				//nodeView_final.VSet("leftPanelPinned", source == "left-panel" && newPanel != null ? true : DEL);
//            				nodeView_final.leftPanelPinned = source == "left-panel" && newPanel != null ? true : undefined;
//
//            				if (newPanel == null) {
//            					this.SetState({lastHoveredPanel: null});
//            				}
//
//            				// if using local-panel-state, manually trigger update at end (since mobx not activated for the local-node-view object)
//            				if (useLocalPanelState) this.Update();
//            			});
//            		};
//
//            		const subscription = GetNodeSubscription(MeID()!, node.id);
//            		const subscriptionLevel = GetSubscriptionLevel(subscription);
//
//            		const showNotificationButton = ShowNotification(node.type);
//            		const showNotificationPaint = showNotificationButton && (mapState?.subscriptionPaintMode ?? false);
//            		let showNotificationPaintCss = "none";
//            		if (showNotificationPaint) {
//            			if (subscriptionLevel == "all") {
//            				showNotificationPaintCss = "1px solid green";
//            			} else if (subscriptionLevel == "partial") {
//            				showNotificationPaintCss = "1px solid yellow";
//            			} else if (subscriptionLevel == "none") {
//            				showNotificationPaintCss = "none";
//            			}
//            		}
//
//            		UseDocumentEventListener("click", e=>{
//            			// if user clicked outside of node-box, close the subscription-level dropdown
//            			if (!e.composedPath().includes(this.root?.DOM as any)) {
//            				this.SetState({showNotificationPanel: false});
//            			}
//            		});
//
//            		UseDocumentEventListener("mouseup", e=>{
//            			uiState.paintMode_painting = false;
//            		});
//
//            		UseDocumentEventListener("mousedown", e=>{
//            			uiState.paintMode_painting = true;
//            		});
//
//            		const renderInner = (dragInfo?: DragInfo)=>{
//            			const asDragPreview = dragInfo?.snapshot.isDragging;
//            			// const offsetByAnotherDrag = dragInfo?.provided.draggableProps.style.transform;
//            			if (asDragPreview) {
//            				hovered = false;
//            				//local_openPanel = null; // todo: reimplement equivalent (if still needed)
//            			}
//
//            			//const {ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath);
//
//            			let width_final =
//            				(node.type != NodeType.argument ? standardWidthInGroup : null) // if argument, we don't care about matching width with peers (since its box is bumped up against that of its first premise)
//            				?? width
//            				?? NodeType_Info.for[node.type].minWidth;
//            			//if (IsNumber(width_final))
//            			width_final = width_final.KeepAtLeast(NodeType_Info.for[node.type].minWidth);
//
//            			const titlePanel = (
//            				<TitlePanel {...{indexInNodeList, parent: this, map, node, path}}
//            					//{...dragInfo?.provided.dragHandleProps}
//            					dragHandleProps={dragInfo?.provided.dragHandleProps}
//            					ref={c=>this.titlePanel = c}
//            					//onClick={onTextHolderClick} // not needed; TitlePanel already handles double-clicks
//            					style={{padding: GetPaddingForNode(node/*, isSubnode*/)}}/>
//            			);
//            			const toolbarElement = toolbarShow
//            				&& <NodeToolbar {...this.props} backgroundColor={backgroundColor} panelToShow={panelToShow} onPanelButtonClick={panel=>onPanelButtonClick(panel, "toolbar")}
//            				nodeUI_width_final={width_final}
//            				leftPanelShow={leftPanelShow}
//            				onMoreClick={()=>{
//            					//onClick();
//            					//RunInAction_Set(this, ()=>store.main.maps.nodeLeftBoxEnabled = !store.main.maps.nodeLeftBoxEnabled);
//            					//setLeftPanelPinned(!leftPanelPinned);
//            					RunInAction_Set(this, ()=>{
//            						if (nodeView == null) return;
//            						nodeView.leftPanelPinned = !nodeView.leftPanelPinned;
//            					});
//            				}}
//            				onMoreHoverChange={hovered=>{
//            					//if (!IsMouseEnterReal(e, this.DOM_HTML)) return;
//            					this.SetState({moreButtonHovered: hovered});
//            				}}/>;
//            			const toolbarAndTitleElements = <>
//            				{/*toolbarShow && node.type != NodeType.argument &&
//            					<div style={{
//            						zIndex: -1,
//            						display: "flex",
//            						height: 28,
//            						//background: "rgba(0,0,0,1)",
//            						background: "rgba(0,0,0,.3)",
//            						borderRadius: "5px 5px 0px 0px",
//            						position: "absolute",
//            						bottom: "100%",
//            						right: -17,
//            						left: 0,
//            						marginTop: 1,
//            					}}/>*/}
//            				{!toolbarShow && titlePanel}
//            				{/* for arguments, we render the toolbar after the title, because it is an "inline toolbar" that is rendered right-of-title on the same row */}
//            				{toolbarShow && node.type == NodeType.argument &&
//            					<Row>{titlePanel}{toolbarElement}</Row>}
//            				{toolbarShow && node.type != NodeType.argument &&
//            					<>{toolbarElement}{titlePanel}</>}
//            			</>;
//
//            			//const extractedPrefixTextInfo = GetExtractedPrefixTextInfo(node, path, map);
//            			//const isShowingToolbarButtonAtTopLeft = extractedPrefixTextInfo?.extractLocation == "toolbar";
//            			const isShowingToolbarButtonAtTopLeft = toolbarItemsToShow.Any(a=>a.panel == "prefix");
//
//            			return (
//            				<>
//            					<ExpandableBox
//            						showNotificationButton={showNotificationButton && !forSubscriptionsPage}
//            						notificationLevel={subscriptionLevel}
//            						onToggleNotifications={()=>this.SetState({showNotificationPanel: !this.state.showNotificationPanel})}
//
//            						ref={useCallback(c=>{
//            							dragInfo?.provided.innerRef(GetDOM(c) as any);
//            							this.root = c;
//            							//if (c) FlashComp(this, {el: c.DOM_HTML, text: "NUI_Inner rendered"});
//            							//ref_leftColumn.current = GetDOM(c) as any;
//            						}, [dragInfo?.provided])}
//            						parent={this}
//            						{...{
//            							outlineColor, outlineThickness, expanded,
//            							backgroundFillPercent: SLMode ? 100 : backgroundFillPercent,
//            							backgroundColor, markerPercent,
//            							//width,
//            							width: width_final,
//            						}}
//            						className={
//            							//classNames("NodeBox", asDragPreview && "DragPreview", {root: pathNodeIDs.length == 0})
//            							[
//            								"NodeBox", "useLightText",
//            								asDragPreview && "DragPreview",
//            								pathNodeIDs.length == 0 && "root",
//            								/*...(timelinesState.recordPanel.recording && mapState?.playingTimeline_time != null ? [
//            									"forFrameRender",
//            									GetClassForFrameRenderAtTime(mapState.playingTimeline_time),
//            								] : []),*/
//            							].filter(a=>a).join(" ")
//            						}
//            						onMouseEnter={onMouseEnter}
//            						onMouseLeave={onMouseLeave}
//            						{...dragInfo?.provided.draggableProps} // {...dragInfo?.provided.dragHandleProps} // drag-handle is attached to just the TitlePanel, above
//            						style={E(
//            							{
//            								color: liveSkin.NodeTextColor().css(),
//            								//margin: "5px 0", // disabled temporarily, while debugging tree-grapher layout issues
//            								//minHeight: 25, // so that argument nodes remain 25px high, even when toolbar is hidden
//            							},
//            							style,
//            							dragInfo?.provided.draggableProps.style,
//            							asDragPreview && {zIndex: zIndexes.draggable},
//            							//outerNode.link._mirrorLink && {border: `solid ${HSLA(0, 0, 1, .3)}`, borderWidth: "0 0 0 1px"}, // if mirror-child, show white border at left
//            						)}
//            						//padding={GetPaddingForNode(node/*, isSubnode*/)}
//            						padding={0}
//            						roundedTopLeftCorner={!isShowingToolbarButtonAtTopLeft}
//            						onClick={onClick}
//            						onDirectClick={onDirectClick}
//            						beforeChildren={<>
//            							{leftPanelShow &&
//            							<NodeUI_LeftBox {...{map, path, node, panelsPosition, backgroundColor}} local_nodeView={useLocalPanelState ? local_nodeView : null} asHover={hovered}
//            								ref={c=>this.leftPanel = c}
//            								usePortal={usePortalForDetailBoxes} nodeUI={this}
//            								onPanelButtonHover={panel=>{
//            									// ignore unhovers
//            									if (panel) this.SetState({lastHoveredPanel: panel});
//            								}}
//            								onPanelButtonClick={panel=>onPanelButtonClick(panel, "left-panel")}
//            								onHoverChange={hovered=>this.SetState({leftPanelHovered: hovered})}
//            							>
//            								{/* fixes click-gap */}
//            								{panelsPosition == "below" && <div style={{position: "absolute", right: -1, width: 1, top: 0, bottom: 0}}/>}
//            							</NodeUI_LeftBox>}
//            							{/* fixes click-gap */}
//            							{/*leftPanelShow && panelsPosition == "left" && <div style={{position: "absolute", right: "100%", width: 1, top: 0, bottom: 0}}/>*/}
//
//            							{showNotificationPanel &&
//            								<NodeNotificationControl {...{node, backgroundColor, subscriptionLevel}}/>}
//            						</>}
//            						//onTextHolderClick={onTextHolderClick}
//            						//textHolderStyle={E(isMultiPremiseArg && {width: null})}
//            						text={<>
//            							{/*!GADDemo && (()=>{
//            								// include this in "text" prop, because that makes the sizing exclude the +/- button
//            								let ratingsPanel: JSX.Element;
//            								if (node.type == NodeType.claim && combinedWithParentArgument) {
//            									const argumentNode = NN(parent);
//            									const argumentPath = NN(SlicePath(path, 1));
//            									ratingsPanel = <RatingsPanel node={argumentNode} path={argumentPath} ratingType={NodeRatingType.impact} asNodeUIOverlay={true}/>;
//            								} else {
//            									ratingsPanel = <RatingsPanel node={node} path={path} ratingType={NodeRatingType.truth} asNodeUIOverlay={true}/>;
//            								}
//            								return <div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
//            									{ratingsPanel}
//            								</div>;
//            							})()*/}
//            							{toolbarAndTitleElements}
//            							{subPanelShow &&
//            							<SubPanel node={node} toolbarShowing={toolbarShow} /*onClick={onTextCompClick}*//>}
//            							<NodeUI_Menu_Stub {...{map, node, path}} delayEventHandler={!usePortalForDetailBoxes}/>
//            						</>}
//            						toggleExpanded={toggleExpanded}
//            						expandButtonStyle={E(toolbar_hasRightAnchoredItems && {borderRadius: "0 0 5px 0"})}
//            						isExpandButtonForNodeChildren={(childrenShownByNodeExpandButton ?? 0) > 0}
//            						afterChildren={<>
//            							{bottomPanelShow
//            								&& <NodeUI_BottomPanel {...{map, node, path, parent, width: width_final, minWidth: standardWidthInGroup, hovered, backgroundColor}}
//            									ref={c=>this.bottomPanel = c}
//            									usePortal={usePortalForDetailBoxes} nodeUI={this} onClick={()=>onPanelButtonClick(panelToShow, "bottom-panel-click")}
//            									panelsPosition={panelsPosition!} panelToShow={panelToShow!}
//            									hoverTermIDs={hoverTermIDs} onTermHover={termIDs=>this.SetState({hoverTermIDs: termIDs})}/>}
//            							{reasonScoreValues && showReasonScoreValues
//            								&& <ReasonScoreValueMarkers {...{node, reasonScoreValues}}/>}
//            						</>}
//            					/>
//            					{showNotificationPaint && <div
//            					onMouseDown={()=>{
//            						uiState.paintMode_painting = true;
//            						if (subscriptionLevel != uiState.paintMode_notificationLevel) {
//            							RunCommand_AddSubscriptionWithLevel({node: node.id, level: uiState.paintMode_notificationLevel});
//            						}
//            					}}
//            					onMouseEnter={()=>{
//            						if (uiState.paintMode_painting && subscriptionLevel != uiState.paintMode_notificationLevel) {
//            							RunCommand_AddSubscriptionWithLevel({node: node.id, level: uiState.paintMode_notificationLevel});
//            						}
//            					}}
//            					style={{
//            						borderRadius: "6px",
//            						position: "absolute", width: width_final + 1, right: -1, top: -1, bottom: -1,
//            						zIndex: 4,
//            						border: showNotificationPaintCss,
//            					}}/>}
//            					<div style={{width: lastWidthWhenNotPreview}}/>
//            					<FrameRenderSignal map={map}/>
//            				</>
//            			);
//            		};
//
//            		/* if (asDragPreview) {
//            			return ReactDOM.createPortal(result, portal);
//            		} */
//            		// return result;
//
//            		const GetDNDProps = ()=>{
//            			if (forLayoutHelper) return null; // don't make draggable if part of layout-helper map (just extra overhead; and glitches atm, probably cause `forLayoutHelper` val isn't in DraggableInfo struct)
//            			if (!PERMISSIONS.Node.Modify(MeID(), node)) return null;
//            			if (!path.includes("/")) return null; // don't make draggable if root-node of map
//            			return {
//            				type: "NodeL1",
//            				draggableInfo: new DraggableInfo({nodePath: path, mapID: map?.id}), // mapID needed for DND-completer to create the link command
//            				index: indexInNodeList,
//            			};
//            		};
//            		const dndProps = GetDNDProps();
//            		if (dndProps == null) {
//            			return renderInner();
//            		}
//
//            		const draggableID = ToJSON(dndProps.draggableInfo);
//            		const renderInner_tracker1 = renderInner(); // always call renderInner once here "outside of Draggable's conditional rendering", so that mobx-accesses are always tracked by this outer observer-component
//            		return (
//            			<>
//            				{/* <div>asDragPreview: {asDragPreview}</div> */}
//            				<Draggable /*type={dndProps.type}*/ key={draggableID} draggableId={draggableID} index={dndProps.index}>
//            					{(provided, snapshot)=>{
//            						const dragInfo: DragInfo = {provided, snapshot};
//            						const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
//
//            						// if drag preview, we have to put in portal, since otherwise the "filter" effect of ancestors causes the {position:fixed} style to not be relative-to-page
//            						if (asDragPreview) return ReactDOM.createPortal(renderInner(dragInfo), portal);
//            						return renderInner(dragInfo);
//            					}}
//            				</Draggable>
//            			</>
//            		);
//            	}
//            	definitionsPanel: DefinitionsPanel;
//            }
