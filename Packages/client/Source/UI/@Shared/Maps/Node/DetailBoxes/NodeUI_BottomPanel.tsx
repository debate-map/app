import {DMap, NodeL3, NodeType, NodeRatingType} from "dm_common";
import React, {useEffect, useRef, useState} from "react";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {ES, RunInAction} from "web-vcore";
import chroma from "chroma-js";
import {GetValues, NN} from "js-vextensions";
import {SlicePath} from "mobx-graphlink";
import ReactDOM from "react-dom";
import {GetMapUICSSFilter} from "../../MapUI.js";
import {NodeBox} from "../NodeBox.js";
import {nodeDetailBoxesLayer_container} from "./NodeDetailBoxesLayer.js";
import {NodeUI_LeftBox_width} from "./NodeUI_LeftBox.js";
import {DefinitionsPanel} from "./Panels/DefinitionsPanel.js";
import {DetailsPanel} from "./Panels/DetailsPanel.js";
import {HistoryPanel} from "./Panels/HistoryPanel.js";
import {OthersPanel} from "./Panels/OthersPanel.js";
import {PhrasingsPanel} from "./Panels/PhrasingsPanel.js";
import {RatingsPanel} from "./Panels/RatingsPanel.js";
import {TagsPanel} from "./Panels/TagsPanel.js";
import {CommentsPanel} from "./Panels/CommentsPanel.js";
import {observer_mgl} from "mobx-graphlink";
import {JSX} from "react";

// TODO:
// We had commented out the loadingUI and componentDidCatch methods,
// when creating functional component(because we didn't have a better alternative at the time).
//
//	loadingUI(bailInfo: BailInfo) {
//		if (this.props.usePortal) return <div/>; // don't show loading-ui in portal, else layout flashes
//		return <DefaultLoadingUI comp={bailInfo.comp} bailMessage={bailInfo.bailMessage}/>;
//	}
//
//	componentDidCatch(message, info) { EB_StoreError(this as any, message, info); }
//
//	 render(){
//	if (this.state["error"]) return EB_ShowError(this.state["error"]);

export const nodeBottomPanel_minWidth = 600;

type Props = {
	map: DMap|n,
	node: NodeL3,
	path: string,
	parent: NodeL3|n,
	width: number|string|n,
	minWidth: number|n, // is this still needed?
	panelsPosition: "left" | "below",
	panelToShow: string,
	hovered: boolean,
	hoverTermIDs: string[]|n,
	onTermHover: (ids: string[])=>void,
	backgroundColor: chroma.Color,
	usePortal?: boolean,
	nodeUI?: NodeBox,
	onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>)=>any,
	ref: React.Ref<HTMLDivElement>,
}

export const NodeUI_BottomPanelFn = observer_mgl((props: Props)=>{
	const {
		map, node, path, parent, width, minWidth, panelsPosition, panelToShow, hovered, hoverTermIDs, onTermHover,
		backgroundColor, usePortal, nodeUI, onClick, ref
	} = props;

	const [hoverTermID, setHoverTermID] = useState<string|n>(null);
	const definitionsPanelRef = useRef<HTMLElement>(null);
	const panelsOpened = useRef(new Set<string>());

	const nodeView = GetNodeView(map?.id, path);
	panelsOpened.current.add(panelToShow);

	const renderPanel = (panelName: string, uiFunc: (show: boolean)=>JSX.Element)=>{
		if (!panelsOpened.current.has(panelName)) return null;
		return uiFunc(panelToShow == panelName);
	};

	let uiRoot: HTMLDivElement;
	if (usePortal) {
		useEffect(()=>{
			let stop = false;
			const update = ()=>{
				if (stop) return;
				if (uiRoot != null && nodeUI!.root?.DOM != null) {
					const nodeUIRect = nodeUI!.root.DOM.getBoundingClientRect();
					uiRoot.style.display = "initial";
					if (panelsPosition == "left") {
						uiRoot.style.left = `${nodeUIRect.left}px`;
						uiRoot.style.top = `${nodeUIRect.bottom + 1}px`;
					} else {
						uiRoot.style.left = `${nodeUIRect.left + NodeUI_LeftBox_width}px`;
						uiRoot.style.top = `${nodeUIRect.bottom + 1}px`;
					}
					uiRoot.style.width = `${nodeUIRect.width}px`;
				}
				requestAnimationFrame(update);
			}
			requestAnimationFrame(update);
			return ()=>{
				stop = true;
			};
		});
	}

	const MaybeCreatePortal = (el: JSX.Element, portal: HTMLElement)=>{
		if (usePortal) return ReactDOM.createPortal(el, portal);
		return el;
	};

	const handleRef = (el: HTMLDivElement | null)=>{
		if (!el) return;
		uiRoot = el!;

		if (!ref) return;
		if (typeof ref === "function") {
			ref(el);
		} else {
			ref.current = el;
		}

	};

	return MaybeCreatePortal(
		<div ref={handleRef} className="NodeUI_BottomPanel useLightText"
			onClick={onClick}
			style={ES(
				{
					position: "absolute",
					zIndex: hovered ? 6 : 5,
					minWidth: (minWidth ?? 0).KeepAtLeast(nodeBottomPanel_minWidth),
					padding: 5, borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
					background: backgroundColor.css(),
					color: liveSkin.NodeTextColor().css(), // needed, in case this panel is portaled
				},
				panelsPosition == "below" && {zIndex: zIndexes.overNavBarDropdown},
				!usePortal && {
					left: panelsPosition == "below" ? 130 + 1 : 0, top: "calc(100% + 1px)",
					width: width ?? "100%",
					filter: "drop-shadow(rgba(0,0,0,1) 0px 10px 10px)",
				},
				usePortal && {
					display: "none", // wait for useEffect func to align position and make visible
					filter: GetMapUICSSFilter(), clipPath: "inset(-1px -150px -150px -1px)",
				},
			)}
		>
			{GetValues(NodeRatingType).Contains(panelToShow) && (()=>{
				if (["impact", "relevance"].Contains(panelToShow) && node.type == NodeType.claim) {
					const argumentNode = NN(parent);
					const argumentPath = NN(SlicePath(path, 1));
					return <RatingsPanel node={argumentNode} path={argumentPath} ratingType={panelToShow as NodeRatingType}/>;
				}
				return <RatingsPanel node={node} path={path} ratingType={panelToShow as NodeRatingType}/>;
			})()}
			{renderPanel("definitions", show=><DefinitionsPanel ref={definitionsPanelRef} {...{show, map, node, path, hoverTermIDs}}
					openTermIDs={nodeView?.openTermIDs}
					onHoverTerm={termIDs=>onTermHover(termIDs)}
					onClickTerm={termIDs=>{
						if (nodeView == null) return;
						RunInAction("NodeBox_onClickTerm", ()=>nodeView.openTermIDs = termIDs);
					}}/>)
			}
			{renderPanel("phrasings", show=><PhrasingsPanel {...{show, map, node, path}}/>)}
			{renderPanel("tags", show=><TagsPanel {...{show, map, node, path}}/>)}
			{renderPanel("details", show=><DetailsPanel {...{show, map, node, path}}/>)}
			{renderPanel("history", show=><HistoryPanel {...{show, map, node, path}}/>)}
			{renderPanel("comments", show=><CommentsPanel {...{show, map, node, path}}/>)}
			{renderPanel("others", show=><OthersPanel {...{show, map, node, path}}/>)}
		</div>,
		nodeDetailBoxesLayer_container,
	);
});
