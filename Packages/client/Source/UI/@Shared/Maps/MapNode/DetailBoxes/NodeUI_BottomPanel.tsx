import {Map, MapNodeL3, MapNodeType, NodeRatingType} from "dm_common";
import React from "react";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {DefaultLoadingUI, EB_ShowError, EB_StoreError, ES, Observer, RunInAction} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
//import classNames from "classnames";
import {GetValues, NN} from "web-vcore/nm/js-vextensions.js";
import {BailInfo, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import ReactDOM from "web-vcore/nm/react-dom.js";
import {BaseComponentPlus, UseEffect} from "web-vcore/nm/react-vextensions.js";
import {GetMapUICSSFilter} from "../../MapUI.js";
import {NodeUI_Inner} from "../NodeUI_Inner.js";
import {nodeDetailBoxesLayer_container} from "./NodeDetailBoxesLayer.js";
import {NodeUI_LeftBox_width} from "./NodeUI_LeftBox.js";
import {DefinitionsPanel} from "./Panels/DefinitionsPanel.js";
import {DetailsPanel} from "./Panels/DetailsPanel.js";
import {DiscussionPanel} from "./Panels/DiscussionPanel.js";
import {HistoryPanel} from "./Panels/HistoryPanel.js";
import {OthersPanel} from "./Panels/OthersPanel.js";
import {PhrasingsPanel} from "./Panels/PhrasingsPanel.js";
import {RatingsPanel} from "./Panels/RatingsPanel.js";
import {SocialPanel} from "./Panels/SocialPanel.js";
import {TagsPanel} from "./Panels/TagsPanel.js";

//export const nodeBottomPanel_minWidth = 550;
export const nodeBottomPanel_minWidth = 600;

@Observer
export class NodeUI_BottomPanel extends BaseComponentPlus(
	{} as {
		map: Map|n, node: MapNodeL3, path: string, parent: MapNodeL3|n,
		width: number|string|n,
		minWidth: number|n, // is this still needed?
		panelsPosition: "left" | "below", panelToShow: string, hovered: boolean, hoverTermIDs: string[]|n, onTermHover: (ids: string[])=>void,
		backgroundColor: chroma.Color,
		usePortal?: boolean, nodeUI?: NodeUI_Inner,
	},
	{hoverTermID: null as string|n},
) {
	panelsOpened = new Set();

	loadingUI(bailInfo: BailInfo) {
		if (this.props.usePortal) return <div/>; // don't show loading-ui in portal, else layout flashes
		return <DefaultLoadingUI comp={bailInfo.comp} bailMessage={bailInfo.bailMessage}/>;
	}

	componentDidCatch(message, info) { EB_StoreError(this as any, message, info); }
	render() {
		if (this.state["error"]) return EB_ShowError(this.state["error"]);
		const {
			map, node, path, parent,
			width, minWidth, panelsPosition, panelToShow, hovered, hoverTermIDs, onTermHover,
			backgroundColor,
			usePortal, nodeUI,
		} = this.props;
		const nodeView = GetNodeView(map?.id, path);

		this.panelsOpened.add(panelToShow);
		const renderPanel = (panelName: string, uiFunc: (show: boolean)=>JSX.Element)=>{
			if (!this.panelsOpened.has(panelName)) return null;
			return uiFunc(panelToShow == panelName);
		};

		if (usePortal) {
			/*UseEffect(()=>{
				const timer = new Timer(1000 / 60, ()=>{
					if (uiRoot == null || nodeUI.root?.DOM == null) return;
					const nodeUIRect = nodeUI.root.DOM.getBoundingClientRect();
					uiRoot.style.left = `${nodeUIRect.left}px`;
					uiRoot.style.top = `${nodeUIRect.bottom}px`;
				}).Start();
				return ()=>timer.Stop();
			});*/
			UseEffect(()=>{
				let stop = false;
				requestAnimationFrame(update);
				function update() {
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
				return ()=>{
					stop = true;
				};
			});
		}
		const MaybeCreatePortal = (el: JSX.Element, portal: HTMLElement)=>{
			if (usePortal) return ReactDOM.createPortal(el, portal);
			return el;
		};

		let uiRoot: HTMLDivElement;
		return MaybeCreatePortal(
			// <ErrorBoundary>
			<div ref={c=>uiRoot = c!} className="NodeUI_BottomPanel" style={ES(
				{
					position: "absolute",
					zIndex: hovered ? 6 : 5,
					minWidth: (minWidth ?? 0).KeepAtLeast(nodeBottomPanel_minWidth),
					padding: 5, borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
					background: backgroundColor.css(),
					//background: liveSkin.BasePanelBackgroundColor().alpha(.9).css(),
					color: liveSkin.NodeTextColor().css(), // needed, in case this panel is portaled
				},
				panelsPosition == "below" && {zIndex: zIndexes.overNavBarDropdowns},
				!usePortal && {
					left: panelsPosition == "below" ? 130 + 1 : 0, top: "calc(100% + 1px)",
					width: width ?? "100%",
					//boxShadow: "rgba(255,255,255,.3) 0px 3px 3px",
					//filter: "drop-shadow(rgba(255,255,255,.3) 0px 3px 3px)",
					//filter: "drop-shadow(rgba(0,0,0,1) 0px 12px 12px)",
					filter: "drop-shadow(rgba(0,0,0,1) 0px 10px 10px)",
				},
				usePortal && {
					display: "none", // wait for UseEffect func to align position and make visible
					filter: GetMapUICSSFilter(), clipPath: "inset(-1px -150px -150px -1px)",
				},
			)}>
				{GetValues(NodeRatingType).Contains(panelToShow) && (()=>{
					if (["impact", "relevance"].Contains(panelToShow) && node.type == MapNodeType.claim) {
						const argumentNode = NN(parent);
						const argumentPath = NN(SlicePath(path, 1));
						return <RatingsPanel node={argumentNode} path={argumentPath} ratingType={panelToShow as NodeRatingType}/>;
					}
					return <RatingsPanel node={node} path={path} ratingType={panelToShow as NodeRatingType}/>;
				})()}
				{renderPanel("definitions", show=><DefinitionsPanel ref={c=>this.definitionsPanel = c} {...{show, map, node, path, hoverTermIDs}}
						openTermIDs={nodeView?.openTermIDs}
						onHoverTerm={termIDs=>onTermHover(termIDs)}
						onClickTerm={termIDs=>{
							if (nodeView == null) return;
							RunInAction("NodeUI_Inner_onClickTerm", ()=>nodeView.openTermIDs = termIDs);
						}}/>)}
				{renderPanel("phrasings", show=><PhrasingsPanel {...{show, map, node, path}}/>)}
				{renderPanel("discussion", show=><DiscussionPanel {...{show}}/>)}
				{renderPanel("social", show=><SocialPanel {...{show}}/>)}
				{renderPanel("tags", show=><TagsPanel {...{show, map, node, path}}/>)}
				{renderPanel("details", show=><DetailsPanel {...{show, map, node, path}}/>)}
				{renderPanel("history", show=><HistoryPanel {...{show, map, node, path}}/>)}
				{renderPanel("others", show=><OthersPanel {...{show, map, node, path}}/>)}
			</div>,
			nodeDetailBoxesLayer_container,
		);
	}
	definitionsPanel: DefinitionsPanel|n;
}