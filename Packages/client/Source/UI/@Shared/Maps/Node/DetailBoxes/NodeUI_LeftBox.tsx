import {ClaimForm, GetNodeForm, GetParentNodeL3, GetRatingSummary, GetRatingTypeInfo, GetRatingTypesForNode, IsUserCreatorOrMod, Map, NodeL3, NodeType_Info, NodeView, MeID, NodeRatingType} from "dm_common";
import React from "react";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {zIndexes} from "Utils/UI/ZIndexes";
import {Chroma, DefaultLoadingUI, Observer} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
import {E} from "web-vcore/nm/js-vextensions.js";
import {BailInfo, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import ReactDOM from "web-vcore/nm/react-dom.js";
import {Button, Span} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus, cssHelper, UseEffect} from "web-vcore/nm/react-vextensions.js";
import {GetMapUICSSFilter} from "../../MapUI.js";
import {NodeBox} from "../NodeBox.js";
import {nodeDetailBoxesLayer_container} from "./NodeDetailBoxesLayer.js";
import {SLMode_SFI} from "../../../../@SL/SL.js";

export const NodeUI_LeftBox_width = 130;

type Props = {
	map: Map|n, path: string, node: NodeL3,
	panelsPosition?: "left" | "below", local_nodeView?: NodeView|n,
	backgroundColor: chroma.Color, asHover: boolean, inList?: boolean, style?,
	onPanelButtonHover: (panel: string)=>void, onPanelButtonClick: (panel: string)=>void,
	usePortal?: boolean, nodeUI?: NodeBox,
	onHoverChange?: (hovered: boolean)=>any,
};
@Observer
export class NodeUI_LeftBox extends BaseComponentPlus({panelsPosition: "left"} as Props, {}) {
	loadingUI(bailInfo: BailInfo) {
		if (this.props.usePortal) return <div/>; // don't show loading-ui in portal, else layout flashes
		return <DefaultLoadingUI comp={bailInfo.comp} bailMessage={bailInfo.bailMessage}/>;
	}

	render() {
		const {
			map, path, node,
			panelsPosition, local_nodeView,
			backgroundColor, asHover, inList, onPanelButtonHover, onPanelButtonClick, style,
			children,
			usePortal, nodeUI,
			onHoverChange,
		} = this.props;
		const nodeView = local_nodeView ?? GetNodeView(map?.id, path);
		const openPanel = nodeView?.openPanel;

		const form = GetNodeForm(node, path);
		const parentNode = GetParentNodeL3(path);

		const ratingTypes = GetRatingTypesForNode(node);

		if (usePortal) {
			UseEffect(()=>{
				let stop = false;
				requestAnimationFrame(update);
				function update() {
					if (stop) return;
					if (uiRoot != null && nodeUI!.root?.DOM != null) {
						const nodeUIRect = nodeUI!.root.DOM.getBoundingClientRect();
						uiRoot.style.display = "initial";
						if (panelsPosition == "left") {
							uiRoot.style.left = `${nodeUIRect.left - 110}px`;
							uiRoot.style.top = `${nodeUIRect.top}px`;
						} else {
							uiRoot.style.left = `${nodeUIRect.left}px`;
							uiRoot.style.top = `${nodeUIRect.bottom + 1}px`;
						}
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
			<div ref={c=>uiRoot = c!} className="NodeUI_LeftBox"
				onMouseEnter={e=>onHoverChange?.(true)}
				onMouseLeave={e=>onHoverChange?.(false)}
				style={E(
					{flexDirection: "column", whiteSpace: "nowrap", width: 110, zIndex: asHover ? 6 : 5},
					!inList && panelsPosition == "left" && {
						position: "absolute",
						//right: "calc(100% + 1px)",
						right: "100%", paddingRight: 1,
					},
					!inList && panelsPosition == "below" && {
						position: "absolute", width: NodeUI_LeftBox_width,
						//top: "calc(100% + 1px)",
						top: "100%", paddingTop: 1,
						zIndex: zIndexes.overNavBarDropdown,
					},
					!usePortal && {
						display: "flex",
					},
					usePortal && {
						display: "none", // wait for UseEffect func to align position and make visible
						filter: GetMapUICSSFilter(),
					},
					style,
				)}
			>
				{children}
				<div style={{
					position: "relative", borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
					background: backgroundColor.alpha(0.95).css(),
				}}>
					{ratingTypes.map((ratingInfo, index)=>{
						const ratingTypeInfo = GetRatingTypeInfo(ratingInfo.type, node, parentNode, path);
						let percentStr = "...";
						const ratingSummary = GetRatingSummary(node.id, ratingInfo.type);
						if (ratingSummary.average != null) {
							percentStr = `${ratingSummary.average.RoundTo(1)}%`;
						}
						return (
							<PanelButton key={ratingInfo.type} {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}}
									panel={ratingInfo.type} text={ratingTypeInfo.displayText}
									style={E(
										{fontSize: 13},
										// font-size adjustments to keep rating-type labels from going past edge
										//ratingInfo.type == NodeRatingType.relevance && {fontSize: 13},
										ratingInfo.type == NodeRatingType.significance && {fontSize: 12},
										index == 0 && {marginTop: 0, borderRadius: "5px 5px 0 0"},
									)}>
								<Span ml={5} style={{float: "right"}}>
									{percentStr}
									<sup style={{whiteSpace: "pre", top: -5, marginRight: -3, marginLeft: 1, fontSize: 10}}>
										{(ratingSummary?.countsByRange ?? []).Sum()}
									</sup>
								</Span>
							</PanelButton>
						);
					})}
					<Button text="..."
						style={{
							margin: "-1px 0 1px 0", height: 17, lineHeight: "12px", padding: 0,
							position: "relative", display: "flex", justifyContent: "space-around", // alignItems: "center",
							background: null, boxShadow: null, border: null, borderRadius: "0 0 5px 5px",
							":hover": {background: backgroundColor.alpha(0.5).css()},
						}}/>
				</div>
				<div style={{
					position: "relative", marginTop: 1, borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
					background: backgroundColor.alpha(0.95).css(),
				}}>
					<div style={{
						position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5,
						background: backgroundColor.alpha(0.7).css(),
					}}/>
					{!SLMode_SFI && <PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="phrasings" text="Phrasings" style={{marginTop: 0, borderRadius: "5px 5px 0 0"}}/>}
					{!SLMode_SFI && <PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="definitions" text="Definitions"/>}
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="details"
						text={`Details${IsUserCreatorOrMod(MeID(), node) ? " (edit)" : ""}`}/>
					{!SLMode_SFI && <PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="history" text="History"/>}
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="tags" text="Tags" lastButtonInSeries={SLMode_SFI}/>
					{!SLMode_SFI && <PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="others" text="Others" lastButtonInSeries={true}/>}
					{/*<Button text="..."
						style={{
							margin: "-1px 0 1px 0", height: 17, lineHeight: "12px", padding: 0,
							position: "relative", display: "flex", justifyContent: "space-around", // alignItems: "center",
							background: null, boxShadow: null, border: null,
							borderRadius: "0 0 5px 5px",
							":hover": {background: backgroundColor.alpha(0.5).css()},
						}}/>*/}
				</div>
			</div>,
			nodeDetailBoxesLayer_container,
		);
	}
}

type PanelButton_Props = {
	map: Map|n, path: string, openPanel: string|n, panel: string, text: string, lastButtonInSeries?: boolean, style?,
	onPanelButtonHover: (panel: string|n)=>void, onPanelButtonClick: (panel: string)=>void,
};
class PanelButton extends BaseComponent<PanelButton_Props, {}> {
	render() {
		const {map, path, openPanel, panel, text, lastButtonInSeries, style, children} = this.props;
		const {css} = cssHelper(this);

		const regularBackground = liveSkin.HasWhiteLeftBoxBackground() ? Chroma("rgba(0,0,0,0)") : Chroma("rgba(255,255,255,.1)");
		const hoverBackground = liveSkin.HasWhiteLeftBoxBackground() ? Chroma("rgba(0,0,0,.15)") : Chroma("rgba(255,255,255,.25)");
		return (
			<Button text={text}
				className="useLightText"
				style={css(
					{position: "relative", display: "flex", justifyContent: "space-between", padding: "3px 7px"},
					{
						// border: "1px outset rgba(0,0,0,.35)",
						border: "solid rgba(0,0,0,.4)", borderWidth: "0 0 1px 0",
						boxShadow: "none", borderRadius: 0,
						backgroundColor: regularBackground.css(), ":hover": {backgroundColor: hoverBackground.css()},
						color: liveSkin.NodeTextColor().css(), // needed, in case this panel is portaled
					},
					openPanel == panel && {backgroundColor: hoverBackground.css()},
					lastButtonInSeries && {borderRadius: "0 0 5px 5px", borderWidth: 0},
					style,
				)}
				onClick={()=>{
					const {onPanelButtonClick} = this.props;
					onPanelButtonClick(panel);
				}}
				onMouseEnter={()=>{
					const {onPanelButtonHover} = this.props;
					onPanelButtonHover(panel);
				}}
				onMouseLeave={()=>{
					const {onPanelButtonHover} = this.props;
					onPanelButtonHover(null);
				}}>
				{/* <div style={{position: "absolute", right: -4, width: 4, top: 0, bottom: 0}}/> */}
				{/* capture mouse events in gap above and below self */}
				<div style={{position: "absolute", left: 0, right: 0, top: -3, bottom: -2, cursor: "inherit"}}/>
				{children}
			</Button>
		);
	}
}