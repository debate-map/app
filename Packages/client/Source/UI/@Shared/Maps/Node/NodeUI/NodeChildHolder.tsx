import {ChildGroup, GetChildLayout_Final, GetChildOrdering_Final, GetOrderingValue_AtPath, IsSLModeOrLayout, DMap, NodeL3, NodeType, Polarity} from "dm_common";
import * as React from "react";
import {store} from "Store";
import {GetChildLimitInfoAtLocation, GetDebateMapCrawlerTrimmedPathChildID} from "Store/main/maps.js";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {NodeUI} from "UI/@Shared/Maps/Node/NodeUI.js";
import {DroppableInfo} from "Utils/UI/DNDStructures.js";
import {WaitXThenRun_Deduped} from "web-vcore";
import {E, ToJSON, Vector2, VRect, WaitXThenRun} from "js-vextensions";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "@hello-pangea/dnd";
import {Column} from "react-vcomponents";
import {GetPlaybackInfo} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {ArgumentsControlBar} from "../ArgumentsControlBar.js";
import {ChildLimitBar} from "./ChildLimitBar.js";
import {GetMeasurementInfoForNode} from "./NodeMeasurer.js";
import {observer_mgl} from "mobx-graphlink";
import {useState, useRef, useEffect} from "react";
import {NodeUIElem} from "../NodeUI.js";

type Props = {
	map: DMap,
	parentNode: NodeL3,
	parentPath: string,
	parentTreePath: string,
	parentTreePath_priorChildCount?: number,
	showEvenIfParentNotExpanded: boolean,
	group: ChildGroup,
	separateChildren: boolean,
	showArgumentsControlBar: boolean,
	belowNodeUI?: boolean,
	minWidth?: number,
	onSizesChange?: (aboveSize: number, belowSize: number)=>void,
	forLayoutHelper: boolean,
	nodeChildrenToShow: NodeL3[],
};

type State = {
	childrenWidthOverride: number|n,
	lastChildBoxOffsets: {[key: number]: Vector2}|n,
	placeholderRect: VRect|n,
};

type Stash = {
	nodeChildren_orderingValues: {[key: string]: number | string}
};

export const NodeChildHolder = observer_mgl((props: Props)=>{
	const {map, parentNode, parentPath, parentTreePath, parentTreePath_priorChildCount, group, separateChildren, showArgumentsControlBar, belowNodeUI,
		minWidth, forLayoutHelper, nodeChildrenToShow, showEvenIfParentNotExpanded
	} = props;
	const [state, setState] = useState<State>({
		childrenWidthOverride: null,
		lastChildBoxOffsets: null,
		placeholderRect: null,
	});

	const initialSpanRef = useRef<HTMLSpanElement>(null);
	const lastSpanRef = useRef<HTMLSpanElement>(null);

	const argumentsControlBarRef = useRef<HTMLDivElement>(null);
	const childBoxes = useRef<{[key: number]: NodeUIElem}>({});
	const isMounted = useRef(false);
	const lastHeight = useRef(0);
	const lastDividePoint = useRef(0);
	const lastOrderStr = useRef<string|n>(null);
	const polarityGroupRefHolder = useRef<Record<string, HTMLElement | null>>({});

	const setPolarityGroupRef = (key: string, el: HTMLElement | null)=>{
		polarityGroupRefHolder.current[key] = el;
	};

	const shouldChildrenShow = ()=>{
		const {parentPath: path} = props;
		const nodeView = GetNodeView(map.id, path)!;
		return nodeView.expanded || showEvenIfParentNotExpanded;
	}

	const childOrderStr = ()=>{
		return nodeChildrenToShow.OrderBy(a=>nodeChildren_orderingValues?.[a.id] ?? 0).map(a=>a.id).join(",");
	}

	const onChildHeightOrPosChange = ()=>{
		WaitXThenRun_Deduped(this, "OnChildHeightOrPosChange_lastPart", 0, ()=>{
			if (!isMounted.current) return;
			checkForLocalChanges();
		});
	}

	const getDividePoint = ()=>{
		return 0;
	}

	const startGeneratingPositionedPlaceholder = (group: "all" | "up" | "down")=>{
		// NOTE: all the code was commented out already, check the earlier version through master branch
	};

	useEffect(()=>{
		isMounted.current = true;
		return ()=>{isMounted.current = false;};
	},[])

	useEffect(()=>{
		checkForLocalChanges();
	});

	// Checks for at-our-level state that may require us to update our width or child-box-offsets (for positioning our lines to child nodes).
	// Note that there are other pathways by which our width/child-box-offsets may be updated. (eg. if child box repositions, an update is triggered through OnChildHeightOrPosChange)
	const checkForLocalChanges = ()=>{
		const {parentNode: node, onSizesChange} = props;

		let height = 0;
		if (initialSpanRef.current && lastSpanRef.current) {
			let el: HTMLElement | null = initialSpanRef.current.nextElementSibling as HTMLElement;
        	while (el && el !== lastSpanRef.current) {
        	    height += el.offsetHeight;
        	    el = el.nextElementSibling as HTMLElement;
        	}
		}
		const dividePoint = getDividePoint();
		if (height != lastHeight.current || dividePoint != lastDividePoint.current) {
			//MaybeLog(
				//a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node.id),
				//()=>`OnHeightChange NodeChildHolder (${RenderSource[this.lastRender_source]}):${this.props.parentNode.id}${nl}dividePoint:${dividePoint}`,
			//);
			// this.UpdateState(true);
			if (onSizesChange) onSizesChange(dividePoint, height - dividePoint);
		}
		lastHeight.current = height;
		lastDividePoint.current = dividePoint;

		const orderStr = childOrderStr();
		if (orderStr != lastOrderStr.current) {
			// this.OnChildHeightOrPosOrOrderChange();
			// this.ReportDividePointChange();
		}
		lastOrderStr.current = orderStr;
	}

	const playback = GetPlaybackInfo();
	const childLayout = GetChildLayout_Final(parentNode.current, map);
	const showArgumentsControlBar_final = !store.main.internalCrawlerMode && showArgumentsControlBar && !(playback?.timeline && store.main.timelines.hideEditingControls) && !IsSLModeOrLayout(childLayout) && !store.main.maps.screenshotMode;

	const nodeView = GetNodeView(map.id, parentPath);
	const orderingType = GetChildOrdering_Final(parentNode, group, map, store.main.maps.childOrdering);
	const nodeChildren_orderingValues = nodeChildrenToShow.filter(a=>a).ToMapObj(child=>`${child.id}`, child=>{
		return GetOrderingValue_AtPath(child, `${parentPath}/${child.id}`, orderingType);
	});

	const stash = useRef<Stash>({nodeChildren_orderingValues});
	const {currentNodeBeingAdded_path} = store.main.maps;

	let nodeChildrenToShowHere = nodeChildrenToShow;
	// always apply an initial sorting by manual-ordering data, so that if main ordering values are the same for a set (eg. no vote data), the set still has sub-sorting
	nodeChildrenToShowHere = nodeChildrenToShowHere.OrderBy(a=>GetChildOrdering_Final(parentNode, group, map, store.main.maps.childOrdering));
	// then apply the sorting for the main ordering-type (latest OrderBy() operation has higher priority, naturally)
	nodeChildrenToShowHere = nodeChildrenToShowHere.OrderBy(child=>nodeChildren_orderingValues[child.id]);

	const upChildren = separateChildren ? nodeChildrenToShowHere.filter(a=>a.displayPolarity == Polarity.supporting) : [];
	const downChildren = separateChildren ? nodeChildrenToShowHere.filter(a=>a.displayPolarity == Polarity.opposing) : [];
	const crawlerPathChildID = parentNode.type == NodeType.argument && group == ChildGroup.generic ? null : GetDebateMapCrawlerTrimmedPathChildID(parentPath); // premises stay together with their argument

	const PrepPolarityGroup = (polarityGroup: "all" | "up" | "down")=>{
		const direction = polarityGroup == "up" ? "up" : "down";
		const childrenHere_untrimmed = polarityGroup == "all" ? nodeChildrenToShowHere : polarityGroup == "up" ? upChildren : downChildren;
		const crawlerPathChild = crawlerPathChildID == null ? null : childrenHere_untrimmed.find(a=>a.id == crawlerPathChildID);
		const crawlerPathChildShowing = crawlerPathChildID == null ? null : crawlerPathChild != null;
		// one bar for all hidden siblings, owned by the path child's group
		const childCount = crawlerPathChildShowing ? nodeChildrenToShowHere.length : childrenHere_untrimmed.length;
		const childLimitInfo = GetChildLimitInfoAtLocation(map, forLayoutHelper, parentNode, parentPath, direction, childCount, crawlerPathChildShowing);

		const childrenHere = crawlerPathChildID == null ? childrenHere_untrimmed.slice(0, childLimitInfo.showTarget_actual) : crawlerPathChild == null ? [] : [crawlerPathChild]; // trim to the X most significant children (ie. strongest arguments), or just the path child in crawler mode
		// if direction is up, we need to have the first-in-children-array/highest-fill-percent entries show at the *bottom*, so reverse the children-here array
		if (direction == "up") childrenHere.reverse();

		return {direction: direction as "up" | "down", childLimitInfo, children_untrimmed: childrenHere_untrimmed, children_trimmed: childrenHere, crawlerPathChildShowing};
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

	const childrenWidthOverride = ncToShowHere_all_trimmed_measurements.map(a=>a.width).concat(0).Max(undefined, true).KeepAtLeast(minWidth ?? 0);

	let nextChildFullIndex = parentTreePath_priorChildCount ?? 0;
	const RenderPolarityGroup = (polarityGroup: "all" | "up" | "down")=>{
		const ncToShowHere_thisGroup =
			polarityGroup == "all" ? ncToShowHere_groupAll :
			polarityGroup == "up" ? ncToShowHere_groupUp :
			ncToShowHere_groupDown;
		if (ncToShowHere_thisGroup.crawlerPathChildShowing === false) return null;

		const childrenHere = ncToShowHere_thisGroup.children_trimmed;
		const showLimitBar = ncToShowHere_thisGroup.childLimitInfo.ShouldLimitBarShow() && !store.main.maps.screenshotMode;

		// wrap in func, so the execution-orders always match the display-orders (so that tree-path is correct)
		const getLimitBar = ()=>{
			return <ChildLimitBar key="limit-bar" {...{
				map, node: parentNode, path: parentPath,
				treePath: `${parentTreePath}/${nextChildFullIndex++}`,
				inBelowGroup: belowNodeUI ?? false, childrenWidthOverride,
				childLimitInfo: ncToShowHere_thisGroup.childLimitInfo,
			}}/>;
		};

		const childrenHereAndLimitBarUIs = childrenHere.map((child, index)=>{
			const indexOfOutermostVisibleChild = ncToShowHere_thisGroup.direction == "down" ? childrenHere.length - 1 : 0; // the childrenHere array is already trimmed to the child-limit, so its first/last entry is the outermost visible
			const showLimitBarHere = index == indexOfOutermostVisibleChild && showLimitBar;

			const getNodeUI = ()=>{
				return <NodeUI key={child.id}
					ref={c=>{childBoxes.current[child.id] = c}}
					indexInNodeList={index} map={map} node={child}
					path={`${parentPath}/${child.id}`}
					treePath={`${parentTreePath}/${nextChildFullIndex++}`}
					forLayoutHelper={forLayoutHelper}
					inBelowGroup={belowNodeUI}
					standardWidthInGroup={childrenWidthOverride}
					onHeightOrPosChange={onChildHeightOrPosChange}/>;
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

		// special case: we need to manually add the limit-bar, if loop above never ran
		// (due to children limit currently being at 0, ie. no children node-uis rendering atm)
		if (childrenHere.length == 0 && ncToShowHere_thisGroup.children_untrimmed.length > 0) {
			childrenHereAndLimitBarUIs.push(getLimitBar());
		}

		return (
			<Droppable type="NodeL1" droppableId={ToJSON(droppableInfo.VSet({subtype: polarityGroup, childIDs: childrenHere.map(a=>a.id)}))}>
				{(provided: DroppableProvided, snapshot: DroppableStateSnapshot)=>{
					const dragIsOverDropArea = (provided.placeholder as any)?.props["on"] != null;
					if (dragIsOverDropArea) {
						WaitXThenRun(0, ()=>startGeneratingPositionedPlaceholder(polarityGroup));
					}

					const refName = `${polarityGroup}ChildHolder`;
					const handleRef = (c: Column|n)=>{
						const dom = c?.root || null;
						setPolarityGroupRef(refName, dom);
						provided.innerRef(dom);
					};
					return (
						<>
							<Column ref={handleRef} ct className={refName} {...provided.droppableProps}
								style={E(
									/*{position: "relative"},
									childrenHere.length == 0 && {position: "absolute", top: polarityGroup == "down" ? "100%" : 0, width: NodeType_Info.for[NodeType.claim].minWidth, height: 100},*/

									// for now, just use an absolutely-positioned, empty rect; doesn't allow actual dropping, but allows dragging *from* map onto timeline-steps -- proper fix required rework, for new layout system
									{position: "absolute", left: 0, top: 0, width: 0, height: 0},
								)}>
								{/* childrenHere.length == 0 && <div style={{ position: 'absolute', top: '100%', width: '100%', height: 200 }}/> */}
								{provided.placeholder}
								{dragIsOverDropArea && state.placeholderRect &&
									<div style={{
										position: "absolute", left: 0, top: state.placeholderRect.y, width: childrenWidthOverride || state.placeholderRect.width, height: state.placeholderRect.height,
										border: "1px dashed rgba(255,255,255,1)", borderRadius: 5,
									}}/>}
							</Column>
							{childrenHereAndLimitBarUIs}
						</>
					);
				}}
			</Droppable>
		);
	}

	const droppableInfo = new DroppableInfo({type: "NodeChildHolder", parentPath, childGroup: group});
	return (
		<>
			<span ref={initialSpanRef} style={{display: "none"}}/>
			{!separateChildren && RenderPolarityGroup("all")}
			{separateChildren && RenderPolarityGroup("up")}
			{showArgumentsControlBar_final &&
				<ArgumentsControlBar
					ref={argumentsControlBarRef} map={map} node={parentNode} path={parentPath}
					treePath={`${parentTreePath}/${nextChildFullIndex++}`} inBelowGroup={belowNodeUI ?? false}
					group={group} childBeingAdded={currentNodeBeingAdded_path == `${parentPath}/?`}
				/>
			}
			{separateChildren && RenderPolarityGroup("down")}
			<span ref={lastSpanRef} style={{display: "none"}}/>
		</>
	);
});
