import {ChildGroup, ClaimForm, GetChangeTypeOutlineColor, GetMainRatingType, GetNodeForm, GetNodeL3, GetPaddingForNode, GetPathNodeIDs, IsUserCreatorOrMod, Map, NodeL3, NodeType, NodeType_Info, NodeView, MeID, NodeRatingType, ReasonScoreValues_RSPrefix, RS_CalculateTruthScore, RS_CalculateTruthScoreComposite, RS_GetAllValues, ChildOrdering, GetExpandedByDefaultAttachment, GetSubPanelAttachments, ShowNodeToolbar, GetExtractedPrefixTextInfo, GetToolbarItemsToShow} from "dm_common";
import React, {useCallback, useEffect, useState} from "react";
import {store} from "Store";
import {GetNodeChangeType} from "Store/db_ext/mapNodeEdits.js";
import {GetNodeColor} from "Store/db_ext/nodes";
import {GetMapState, GetNodeRevealHighlightTime, GetPlayingTimeline, GetTimeFromWhichToShowChangedNodes, GetTimeSinceNodeRevealedByPlayingTimeline} from "Store/main/maps/mapStates/$mapState.js";
import {ACTNodeExpandedSet, ACTNodeSelect, GetNodeView, GetNodeViewsAlongPath} from "Store/main/maps/mapViews/$mapView.js";
import {SLMode} from "UI/@SL/SL.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {DraggableInfo} from "Utils/UI/DNDStructures.js";
import {FlashComp} from "ui-debug-kit";
import {IsMouseEnterReal, IsMouseLeaveReal} from "Utils/UI/General.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {DragInfo, HSLA, IsDoubleClick, Observer, RunInAction, RunInAction_Set, UseDocumentEventListener} from "web-vcore";
import chroma, {Color} from "web-vcore/nm/chroma-js.js";
//import classNames from "classnames";
import {DEL, DoNothing, E, GetPercentFromXToY, IsNumber, NN, Timer, ToJSON, Vector2, VRect, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {Draggable} from "web-vcore/nm/react-beautiful-dnd.js";
import ReactDOM from "web-vcore/nm/react-dom.js";
import {BaseComponent, BaseComponentPlus, GetDOM, UseCallback, UseEffect} from "web-vcore/nm/react-vextensions.js";
import {useRef_nodeLeftColumn} from "tree-grapher";
import {Row} from "web-vcore/nm/react-vcomponents.js";
import {UseForcedExpandForPath} from "Store/main/maps.js";
import {autorun} from "mobx";
import {AutoRun_HandleBail} from "Utils/AutoRuns/@Helpers.js";
import {GetClassForFrameRenderAtTime} from "UI/@Shared/Timelines/TimelinePanel/StepList/RecordDropdown.js";
import {NodeUI_BottomPanel} from "./DetailBoxes/NodeUI_BottomPanel.js";
import {NodeUI_LeftBox} from "./DetailBoxes/NodeUI_LeftBox.js";
import {DefinitionsPanel} from "./DetailBoxes/Panels/DefinitionsPanel.js";
import {RatingsPanel} from "./DetailBoxes/Panels/RatingsPanel.js";
import {ExpandableBox} from "./ExpandableBox.js";
import {NodeToolbar} from "./NodeBox/NodeToolbar.js";
import {SubPanel} from "./NodeBox/SubPanel.js";
import {TitlePanel} from "./NodeBox/TitlePanel.js";
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

export type NodeBox_Props = {
	indexInNodeList: number, node: NodeL3, path: string, treePath: string, map?: Map, forLayoutHelper: boolean,
	width?: number/*|string*/|n, standardWidthInGroup?: number|n, backgroundFillPercentOverride?: number,
	panelsPosition?: "left" | "below", useLocalPanelState?: boolean, style?,
	childrenShownByNodeExpandButton?: number, usePortalForDetailBoxes?: boolean,
} & {dragInfo?: DragInfo};

/* @MakeDraggable(({ node, path, indexInNodeList }: TitlePanelProps) => {
	if (!IsUserCreatorOrMod(MeID(), node)) return null;
	if (!path.includes('/')) return null; // don't make draggable if root-node of map
	return {
		type: 'NodeL1',
		draggableInfo: new DraggableInfo({ nodePath: path }),
		index: indexInNodeList,
	};
}) */

// @ExpensiveComponent
@Observer
export class NodeBox extends BaseComponentPlus(
	{panelsPosition: "left"} as NodeBox_Props,
	{
		hovered: false, moreButtonHovered: false, leftPanelHovered: false, //openPanelSource: null as PanelOpenSource|n,
		hoverPanel: null as string|n, hoverTermIDs: null as string[]|n, lastWidthWhenNotPreview: 0,
	},
) {
	root: ExpandableBox|n;
	titlePanel: TitlePanel|n;
	leftPanel: NodeUI_LeftBox|n;
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
		const {indexInNodeList, map, node, path, treePath, forLayoutHelper, width, standardWidthInGroup, backgroundFillPercentOverride, panelsPosition, useLocalPanelState, style, usePortalForDetailBoxes, childrenShownByNodeExpandButton} = this.props;
		let {hovered, moreButtonHovered, leftPanelHovered, hoverPanel, hoverTermIDs, lastWidthWhenNotPreview} = this.state;

		// connector part
		// ==========

		const [local_nodeView, setLocal_nodeView] = useState({} as NodeView);
		const nodeView = useLocalPanelState ? local_nodeView : GetNodeView(map?.id, path);
		const UpdateLocalNodeView = (updates: Partial<NodeView>)=>{
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

		const useReasonScoreValuesForThisNode = store.main.maps.childOrdering == ChildOrdering.reasonScore && (node.type == NodeType.argument || node.type == NodeType.claim);
		const reasonScoreValues = useReasonScoreValuesForThisNode && RS_GetAllValues(node.id, path, true) as ReasonScoreValues_RSPrefix;

		//const backgroundFillPercent = backgroundFillPercentOverride ?? GetFillPercent_AtPath(ratingNode, ratingNodePath, null);
		const backgroundFillPercent = backgroundFillPercentOverride ?? 100;
		//const markerPercent = GetMarkerPercent_AtPath(ratingNode, ratingNodePath, null);
		const markerPercent = null; // marker is too distracting to be enabled for-now/by-default

		const nodeForm = GetNodeForm(node, path);
		//const phrasings = GetNodePhrasings(node.id);
		const {showReasonScoreValues} = store.main.maps;

		// for css effects that are based on the playing-timeline's "current time", apply these directly/without-reactjs (react has too much overhead for updates that happen many times per second)
		//const playingTimeline = map ? GetPlayingTimeline(map.id) : null;
		UseEffect(()=>{
			//if (playingTimeline == null) return;
			const dispose = AutoRun_HandleBail(()=>{
				const nodeRevealHighlightTime = GetNodeRevealHighlightTime();
				const timeSinceRevealedByTimeline_simplified = map ? GetTimeSinceNodeRevealedByPlayingTimeline(map.id, path, true, true) : null;
				const timeSinceRevealedByTimeline_precise = ()=>(map ? GetTimeSinceNodeRevealedByPlayingTimeline(map.id, path, true, false) : null);

				const boxStyle = this.root?.DOM_HTML?.style;
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

		// the rest
		// ==========

		UseEffect(()=>{
			/* const { dragInfo } = this.props;
			const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
			if (!asDragPreview && this.draggableDiv) { */
			// setDragActive(this.root.DOM.getBoundingClientRect().width);
			if (this.root?.DOM) {
				let renderedWidth = this.root.DOM.getBoundingClientRect().width;
				// store the pre-zoomed width, because we use it for the space-keeper (outside of draggable), on top of which zoom already gets applied
				if (mapState != null && mapState?.zoomLevel != 1) {
					renderedWidth /= mapState.zoomLevel;
				}
				if (renderedWidth != lastWidthWhenNotPreview) {
					this.SetState({lastWidthWhenNotPreview: renderedWidth});
				}
			}
		});

		const nodeTypeInfo = NodeType_Info.for[node.type];
		const backgroundColor = GetNodeColor(node);
		/* const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
		// const offsetByAnotherDrag = dragInfo && dragInfo.provided.draggableProps.style.transform;
		if (asDragPreview) {
			hovered = false;
			local_openPanel = null;
		} */

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
		//const isSubnode = IsNodeSubnode(node);

		const selected = nodeView?.selected || false;
		const leftPanelPinned = nodeView?.leftPanelPinned ?? false;
		/*const [leftPanelPinned, setLeftPanelPinned] = useState(false);
		useEffect(()=>{
			// if left-panel is pinned, but node is no longer selected or hovered, reset its "pinned" state to false
			if (leftPanelPinned && !(selected || hovered)) setLeftPanelPinned(false); 
		}, [selected, leftPanelPinned]);*/

		const toolbarItemsToShow = GetToolbarItemsToShow(node, path, map);
		const toolbarShow = toolbarItemsToShow.length > 0;
		const toolbar_hasRightAnchoredItems = toolbarItemsToShow.filter(a=>a.panel != "prefix").length > 0;
		const panelToShow = hoverPanel || nodeView?.openPanel;
		const leftPanelShow = leftPanelPinned || moreButtonHovered || leftPanelHovered
			//|| (!toolbarShow && (nodeView?.selected || hovered)); // || (/*selected &&*/ panelToShow != null && openPanelSource == "left-panel");
			|| nodeView?.selected || hovered;
		const attachments_forSubPanel = GetSubPanelAttachments(node.current);
		const subPanelShow = attachments_forSubPanel.length > 0;
		const bottomPanelShow = /*(selected || hovered) &&*/ panelToShow != null;
		let expanded = nodeView?.expanded ?? false;
		// passing forLayoutHelperMap=false is fine here (our usage here only affects the node's display, and the layout-helper-map is only used for layout purposes)
		if (UseForcedExpandForPath(path, false)) expanded = true;

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
				ACTNodeSelect(map.id, path);
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
			RunInAction("NodeBox.onDirectClick", ()=>{
				store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now());
			});
		}, [node.id, parent]);
		const onTextCompClick = UseCallback(e=>IsDoubleClick(e) && this.titlePanel && this.titlePanel.OnDoubleClick(), []);
		const toggleExpanded = UseCallback(e=>{
			const newExpanded = !expanded;
			const recursivelyCollapsing = newExpanded == false && e.altKey;
			ACTNodeExpandedSet({mapID: map?.id, path, expanded: newExpanded, resetSubtree: recursivelyCollapsing});

			e.nativeEvent["ignore"] = true; // for some reason, "return false" isn't working
			//return false;
		}, [expanded, map?.id, parentPath, path]);

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

				RunInAction("NodeBox.onPanelButtonClick", ()=>{
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

			//const {ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath);

			let width_final =
				(node.type != NodeType.argument ? standardWidthInGroup : null) // if argument, we don't care about matching width with peers (since its box is bumped up against that of its first premise)
				?? width
				?? NodeType_Info.for[node.type].minWidth;
			//if (IsNumber(width_final))
			width_final = width_final.KeepAtLeast(NodeType_Info.for[node.type].minWidth);

			const titlePanel = (
				<TitlePanel {...{indexInNodeList, parent: this, map, node, path}} {...dragInfo?.provided.dragHandleProps}
					ref={c=>this.titlePanel = c}
					//onClick={onTextHolderClick} // not needed; TitlePanel already handles double-clicks
					style={{padding: GetPaddingForNode(node/*, isSubnode*/)}}/>
			);
			const toolbarElement = toolbarShow
				&& <NodeToolbar {...this.props} backgroundColor={backgroundColor} panelToShow={panelToShow} onPanelButtonClick={panel=>onPanelButtonClick(panel, "toolbar")}
				nodeUI_width_final={width_final}
				leftPanelShow={leftPanelShow}
				onMoreClick={()=>{
					//onClick();
					//RunInAction_Set(this, ()=>store.main.maps.nodeLeftBoxEnabled = !store.main.maps.nodeLeftBoxEnabled);
					//setLeftPanelPinned(!leftPanelPinned);
					RunInAction_Set(this, ()=>{
						if (nodeView == null) return;
						nodeView.leftPanelPinned = !nodeView.leftPanelPinned;
					});
				}}
				onMoreHoverChange={hovered=>{
					//if (!IsMouseEnterReal(e, this.DOM_HTML)) return;
					this.SetState({moreButtonHovered: hovered});
				}}/>;
			const toolbarAndTitleElements = <>
				{/*toolbarShow && node.type != NodeType.argument &&
					<div style={{
						zIndex: -1,
						display: "flex",
						height: 28,
						//background: "rgba(0,0,0,1)",
						background: "rgba(0,0,0,.3)",
						borderRadius: "5px 5px 0px 0px",
						position: "absolute",
						bottom: "100%",
						right: -17,
						left: 0,
						marginTop: 1,
					}}/>*/}
				{!toolbarShow && titlePanel}
				{/* for arguments, we render the toolbar after the title, because it is an "inline toolbar" that is rendered right-of-title on the same row */}
				{toolbarShow && node.type == NodeType.argument &&
					<Row>{titlePanel}{toolbarElement}</Row>}
				{toolbarShow && node.type != NodeType.argument &&
					<>{toolbarElement}{titlePanel}</>}
			</>;

			//const extractedPrefixTextInfo = GetExtractedPrefixTextInfo(node, path, map);
			//const isShowingToolbarButtonAtTopLeft = extractedPrefixTextInfo?.extractLocation == "toolbar";
			const isShowingToolbarButtonAtTopLeft = toolbarItemsToShow.Any(a=>a.panel == "prefix");
			return (
				<ExpandableBox
					ref={useCallback(c=>{
						dragInfo?.provided.innerRef(GetDOM(c) as any);
						this.root = c;
						//if (c) FlashComp(this, {el: c.DOM_HTML, text: "NUI_Inner rendered"});
						//ref_leftColumn.current = GetDOM(c) as any;
					}, [dragInfo?.provided])}
					parent={this}
					{...{
						outlineColor, outlineThickness, expanded,
						backgroundFillPercent: SLMode ? 100 : backgroundFillPercent,
						backgroundColor, markerPercent,
						//width,
						width: width_final,
					}}
					className={
						//classNames("NodeBox", asDragPreview && "DragPreview", {root: pathNodeIDs.length == 0})
						[
							"NodeBox", "useLightText",
							asDragPreview && "DragPreview",
							pathNodeIDs.length == 0 && "root",
							/*...(timelinesState.recordPanel.recording && mapState?.playingTimeline_time != null ? [
								"forFrameRender",
								GetClassForFrameRenderAtTime(mapState.playingTimeline_time),
							] : []),*/
						].filter(a=>a).join(" ")
					}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
					{...dragInfo?.provided.draggableProps} // {...dragInfo?.provided.dragHandleProps} // drag-handle is attached to just the TitlePanel, above
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
					//padding={GetPaddingForNode(node/*, isSubnode*/)}
					padding={0}
					roundedTopLeftCorner={!isShowingToolbarButtonAtTopLeft}
					onClick={onClick}
					onDirectClick={onDirectClick}
					beforeChildren={<>
						{leftPanelShow &&
						<NodeUI_LeftBox {...{map, path, node, panelsPosition, backgroundColor}} local_nodeView={useLocalPanelState ? local_nodeView : null} asHover={hovered}
							ref={c=>this.leftPanel = c}
							usePortal={usePortalForDetailBoxes} nodeUI={this}
							onPanelButtonHover={panel=>this.SetState({hoverPanel: panel})}
							onPanelButtonClick={panel=>onPanelButtonClick(panel, "left-panel")}
							onHoverChange={hovered=>this.SetState({leftPanelHovered: hovered})}
						>
							{/* fixes click-gap */}
							{panelsPosition == "below" && <div style={{position: "absolute", right: -1, width: 1, top: 0, bottom: 0}}/>}
						</NodeUI_LeftBox>}
						{/* fixes click-gap */}
						{/*leftPanelShow && panelsPosition == "left" && <div style={{position: "absolute", right: "100%", width: 1, top: 0, bottom: 0}}/>*/}
					</>}
					//onTextHolderClick={onTextHolderClick}
					//textHolderStyle={E(isMultiPremiseArg && {width: null})}
					text={<>
						{/*!GADDemo && (()=>{
							// include this in "text" prop, because that makes the sizing exclude the +/- button
							let ratingsPanel: JSX.Element;
							if (node.type == NodeType.claim && combinedWithParentArgument) {
								const argumentNode = NN(parent);
								const argumentPath = NN(SlicePath(path, 1));
								ratingsPanel = <RatingsPanel node={argumentNode} path={argumentPath} ratingType={NodeRatingType.impact} asNodeUIOverlay={true}/>;
							} else {
								ratingsPanel = <RatingsPanel node={node} path={path} ratingType={NodeRatingType.truth} asNodeUIOverlay={true}/>;
							}
							return <div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
								{ratingsPanel}
							</div>;
						})()*/}
						{toolbarAndTitleElements}
						{subPanelShow &&
						<SubPanel node={node} toolbarShowing={toolbarShow} /*onClick={onTextCompClick}*//>}
						<NodeUI_Menu_Stub {...{map, node, path}} delayEventHandler={!usePortalForDetailBoxes} childGroup={ChildGroup.generic}/>
					</>}
					toggleExpanded={toggleExpanded}
					expandButtonStyle={E(toolbar_hasRightAnchoredItems && {borderRadius: "0 0 5px 0"})}
					isExpandButtonForNodeChildren={(childrenShownByNodeExpandButton ?? 0) > 0}
					afterChildren={<>
						{bottomPanelShow
							&& <NodeUI_BottomPanel {...{map, node, path, parent, width: width_final, minWidth: standardWidthInGroup, hovered, backgroundColor}}
								ref={c=>this.bottomPanel = c}
								usePortal={usePortalForDetailBoxes} nodeUI={this}
								panelsPosition={panelsPosition!} panelToShow={panelToShow!}
								hoverTermIDs={hoverTermIDs} onTermHover={termIDs=>this.SetState({hoverTermIDs: termIDs})}/>}
						{reasonScoreValues && showReasonScoreValues
							&& <ReasonScoreValueMarkers {...{node, reasonScoreValues}}/>}
					</>}
				/>
			);
		};

		/* if (asDragPreview) {
			return ReactDOM.createPortal(result, portal);
		} */
		// return result;

		const GetDNDProps = ()=>{
			if (forLayoutHelper) return null; // don't make draggable if part of layout-helper map (just extra overhead; and glitches atm, probably cause `forLayoutHelper` val isn't in DraggableInfo struct)
			if (!IsUserCreatorOrMod(MeID(), node)) return null;
			if (!path.includes("/")) return null; // don't make draggable if root-node of map
			return {
				type: "NodeL1",
				draggableInfo: new DraggableInfo({nodePath: path, mapID: map?.id}), // mapID needed for DND-completer to create the link command
				index: indexInNodeList,
			};
		};
		const dndProps = GetDNDProps();
		if (dndProps == null) {
			return renderInner();
		}

		const draggableID = ToJSON(dndProps.draggableInfo);
		const renderInner_tracker1 = renderInner(); // always call renderInner once here "outside of Draggable's conditional rendering", so that mobx-accesses are always tracked by this outer observer-component
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
				<FrameRenderSignal map={map}/>
			</>
		);
	}
	definitionsPanel: DefinitionsPanel;
}

let portal: HTMLElement;
WaitXThenRun(0, ()=>{
	portal = document.createElement("div");
	portal.id = "portalForDragging_NodeBox";
	document.body.appendChild(portal);
});

class ReasonScoreValueMarkers extends BaseComponent<{node: NodeL3, reasonScoreValues: ReasonScoreValues_RSPrefix}, {}> {
	render() {
		const {node, reasonScoreValues} = this.props;
		const mainScore = node.type == NodeType.argument ? RS_CalculateTruthScoreComposite(node.id) : RS_CalculateTruthScore(node.id);
		const {rs_argTruthScoreComposite, rs_argWeightMultiplier, rs_argWeight, rs_claimTruthScore, rs_claimBaseWeight} = reasonScoreValues;
		return (
			<div className="clickThrough" style={{position: "absolute", top: "100%", width: "100%", zIndex: 1, textAlign: "center", fontSize: 14}}>
				{node.type == NodeType.argument && `Truth score: ${mainScore.ToPercentStr()}${
					` Weight: [...]x${rs_argWeightMultiplier.RoundTo_Str(0.01)} = ${rs_argWeight.RoundTo_Str(0.01)}`
				}`}
				{node.type == NodeType.claim && `Truth score: ${mainScore.ToPercentStr()}`}
			</div>
		);
	}
}

/**
 * This is a helper component, used to signify to the timeline frame-renderer system when react has completed rendering of the component tree to reflect the new current-time. (see RecordDropdown.tsx)
 * (this is better than putting the access of mapState.playingTimeline_time in NodeBox directly, since that would cause unnecessary processing of other data during each re-render)
 */
@Observer
export class FrameRenderSignal extends BaseComponent<{map: Map|n}> {
	render() {
		const {map} = this.props;
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
	}
}