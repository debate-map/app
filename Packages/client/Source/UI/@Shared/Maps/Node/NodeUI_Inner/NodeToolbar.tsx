import {ChildGroup, ClaimForm, GetNodeForm, GetNodeL3, GetNodeTags, GetParentNode, GetParentPath, GetRatingAverage, GetRatingSummary, GetRatingTypeInfo, NodeL3, NodeType, NodeRatingType, Polarity, Map, ShowNodeToolbars} from "dm_common";
import React, {useMemo, useState} from "react";
import {Vector2} from "react-vmenu/Dist/Utils/FromJSVE";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {store} from "Store/index.js";
import {RatingPreviewType} from "Store/main/maps.js";
import {GADDemo} from "UI/@GAD/GAD.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {SLSkin} from "Utils/Styles/Skins/SLSkin.js";
import {ES, HSLA, InfoButton, Observer, UseDocumentEventListener} from "web-vcore";
import {Color} from "web-vcore/nm/chroma-js.js";
import {E} from "web-vcore/nm/js-vextensions";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {Row, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponent, cssHelper} from "web-vcore/nm/react-vextensions.js";
import {VMenuUI, ShowVMenu} from "web-vcore/nm/react-vmenu";
import {RatingsPanel_Old} from "../DetailBoxes/Panels/RatingsPanel_Old.js";
import {TOOLBAR_BUTTON_WIDTH} from "../NodeLayoutConstants.js";
import {NodeUI_Inner_Props} from "../NodeUI_Inner.js";
import {NodeUI_Menu} from "../NodeUI_Menu.js";

//export type NodeToolbar_SharedProps = NodeUI_Inner_Props & {backgroundColor: Color};
export type NodeToolbar_Props = {
	backgroundColor: Color, panelToShow?: string, onPanelButtonClick: (panel: string)=>any,
	onMoreClick?: (e: any)=>any, onMoreHoverChange?: (hovered: boolean)=>any,
	nodeUI_width_final: number,
	leftPanelShow: boolean,
} & NodeUI_Inner_Props;
export type NodeToolbar_SharedProps = NodeToolbar_Props & {buttonCount: number}

export function GetToolbarItemsToTryToShow(map?: Map|n) {
	return (map?.extras.toolbarItems?.length ?? 0) > 0 ? map?.extras.toolbarItems! : [{panel: "truth"}, {panel: "relevance"}, {panel: "phrasings"}];
}
export function GetToolbarItemsToShow(node: NodeL3, map?: Map|n) {
	if (!ShowNodeToolbars(map)) return [];
	const itemsToTryToShow = GetToolbarItemsToTryToShow(map);
	return itemsToTryToShow.filter((item, index)=>{
		if (item.panel == "truth" && node.type == NodeType.claim) return true;
		if (item.panel == "relevance" && node.type == NodeType.argument) return true;
		if (item.panel == "tags" && node.type != NodeType.argument) return true;
		if (item.panel == "phrasings" && node.type != NodeType.argument) return true;
		return false;
	});
}

@Observer
export class NodeToolbar extends BaseComponent<NodeToolbar_Props, {}> {
	render() {
		const {map, node, path, backgroundColor, panelToShow, onPanelButtonClick, onMoreClick, onMoreHoverChange, nodeUI_width_final, leftPanelShow} = this.props;
		const parentPath = SlicePath(path, 1);
		const parent = GetNodeL3(parentPath);
		const nodeForm = GetNodeForm(node, path);

		//const sharedProps = {node, panelToShow, onPanelButtonClick, leftPanelShow};
		const sharedProps = E(this.props, {buttonCount: 1}); // button-count is updated shortly
		const {key, css} = cssHelper(this);

		const toolbarItemsToShow = GetToolbarItemsToShow(node, map);
		const tags = GetNodeTags(node.id);
		const labels = tags.filter(a=>a.labels != null).SelectMany(a=>a.labels!.labels).Distinct();
		// exclude clone-history tags because they're auto-created (ie. not relevant for readers, nor for most manual curation work)
		const labelsAndOtherTags = labels.length + tags.filter(a=>a.labels == null && a.cloneHistory == null).length;
		const getToolbarItemUIs = ()=>{
			let indexAmongEnabled = 0;
			return toolbarItemsToShow.map((item, index)=>{
				if (item.panel == "truth") {
					return <ToolBarButton key={index} {...sharedProps} first={indexAmongEnabled++ == 0} text="Agreement" panel="truth"
						enabled={node.type == NodeType.claim} disabledInfo="This is an argument; after expanding it, you can give your truth/agreement ratings for its individual premises."/>;
				}
				if (item.panel == "relevance") {
					return <ToolBarButton key={index} {...sharedProps} first={indexAmongEnabled++ == 0} text="Relevance" panel="relevance" enabled={node.type == NodeType.argument}/>;
				}
				if (item.panel == "tags") {
					// if there are labels, display them directly within the toolbar-button
					// todo: make-so you map-creator/user can choose whether to have the "tags" button show the label-previews below, or instead just a tag-count as normal
					if (labels.length) {
						/*const labelUIWidths = labels.map((label, labelI)=>{
							const paddingAndMargin = (labelI > 0 ? 5 : 0) + 10;
							return paddingAndMargin + (label.length * 5.25); // based on ui-test with "fontSize:10" for string: "abc[...]wxy"
						});
						const maxLabelWidth = labelUIWidths.Max();
						if (maxLabelWidth < nodeUI_width_final) {*/

						const allLabelsText = labels.join("   "); // gap = ~3chars
						const fontSize = allLabelsText.length >= 30 ? 9 :
							allLabelsText.length >= 15 ? 10 :
							11;
						return <ToolBarButton key={index} {...sharedProps} first={indexAmongEnabled++ == 0} panel="tags" style={{overflow: "hidden"}}
							text={allLabelsText} // used for estimating width-required for button
							textComp={
								<Row style={{
									width: "100%", /*height: "calc(100% + 1px)",*/ fontSize, flexWrap: "wrap", justifyContent: "center",
									gap: "1px 5px", // use gap of 1, to compensate for {mt:-1,mb:-1} of items, such that they only overlap 1px 
									//alignItems: "center",
									alignItems: /*"center"*/ "initial", // don't use centering of items, else messes up margins (rely on centering of this container as a whole)
								}}>
									{labels.map((label, labelI)=>{
										return <Text key={labelI} mt={-1} mb={-1} p="0 5px"
											style={E(
												{display: "inline-block", background: HSLA(0, 0, 1, .3), borderRadius: 5, cursor: "pointer"},
												GADDemo && {
													background: "transparent", border: "1px solid rgba(43,55,85,.7)", color: "rgba(43,55,85,1)",
												},
											)}>
												{label}
											</Text>;
									})}
								</Row>
							}/>;
					}

					return <ToolBarButton key={index} {...sharedProps} first={indexAmongEnabled++ == 0} text={labelsAndOtherTags > 0 ? `Tags: ${labelsAndOtherTags}` : "Tags"} panel="tags"/>;
				}
				if (item.panel == "phrasings") {
					return <ToolBarButton key={index} {...sharedProps} first={indexAmongEnabled++ == 0} text="Phrasings" panel="phrasings"/>;
				}
			});
		};
		// for this call, we are just getting the number of toolbar-buttons (fine to discard result)
		sharedProps.buttonCount = getToolbarItemUIs().filter(a=>a != null).length;

		/*const [contextMenuOpen, setContextMenuOpen] = useState(false);
		const processedMouseEvents = useMemo(()=>new WeakSet<MouseEvent>(), []); // use WeakSet, so storage about event can be dropped after its processing-queue completes
		UseDocumentEventListener("click", e=>!processedMouseEvents.has(e) && setContextMenuOpen(false));*/

		const showBottomBorder =
			node.type == NodeType.argument ? (node.current.phrasing.note || node.current.attachments.length > 0) :
			true;
		return (
			<Row className={key("NodeToolbar useLightText")} style={css(
				{
					height: 25, background: backgroundColor.css(), borderRadius: "5px 5px 0 0",
					color: liveSkin.NodeTextColor().alpha(GADDemo ? 1 : .4).css(),
					//minWidth: 250, // temp
				},
				node.type == NodeType.argument && {
					position: "relative", // needed to show above
				},
				node.type != NodeType.argument && {
					position: "absolute", bottom: "100%", right: -17, // extend 17px past right edge, to account for +/- button below
				},
				showBottomBorder && {borderBottom: "1px solid black"},
			)}>
				{/*<ToolBarButton {...sharedProps} text="<<" first={true} onClick={onMoreClick} onHoverChange={onMoreHoverChange}/>*/}
				{getToolbarItemUIs()}
				{/*<ToolBarButton {...sharedProps} text="..." last={true} onClick={e=>{
					/*processedMouseEvents.add(e.nativeEvent);
					setContextMenuOpen(!contextMenuOpen);*#/

					const buttonRect = (e.target as HTMLElement).getBoundingClientRect();
					ShowVMenu({
						pos: new Vector2(buttonRect.left, buttonRect.top + buttonRect.height),
					}, <NodeUI_Menu map={map} node={node} path={path} childGroup={ChildGroup.generic}/>);
				}}/>*/}
				{/*<ToolBarButton {...sharedProps} text=">>" last={true}/>*/}
				{/*contextMenuOpen &&
				<div style={{position: "relative"}}>
					<VMenuUI style={{left: -30, top: "100%"}} onOtherVMenuOpen={()=>setContextMenuOpen(false)}>
						<NodeUI_Menu map={map} node={node} path={path} childGroup={ChildGroup.generic}/>
					</VMenuUI>
				</div>*/}
			</Row>
		);
	}
}

@Observer
class ToolBarButton extends BaseComponent<{
	node: NodeL3, text: string, textComp?: JSX.Element, enabled?: boolean, disabledInfo?: string, panel?: string,
	first?: boolean, last?: boolean, panelToShow?: string, onPanelButtonClick: (panel: string)=>any,
	onClick?: (e: React.MouseEvent)=>any, onHoverChange?: (hovered: boolean)=>any,
	leftPanelShow: boolean, style?: any,
} & NodeToolbar_SharedProps, {}> {
	render() {
		let {node, path, text, textComp, enabled = true, disabledInfo, panel, first, last, panelToShow, onPanelButtonClick, onClick, onHoverChange, nodeUI_width_final, leftPanelShow, style, buttonCount} = this.props;
		const [hovered, setHovered] = useState(false);
		let highlight = panel && panelToShow == panel;
		const {toolbarRatingPreviews} = store.main.maps;
		const spacePerButton = (nodeUI_width_final - 40) / (buttonCount ?? 1);
		const sizeIndex =
			spacePerButton >= 80 ? 0 :
			spacePerButton >= 60 ? 1 :
			spacePerButton >= 50 ? 2 :
			3;

		let icon: string|n;
		if (text == "<<") {
			//icon = "chevron-double-left";
			//icon = "dots-vertical";
			icon = "transfer-left";
			text = "";
			highlight = highlight || leftPanelShow;
		} /*else if (text == ">>") {
			icon = "transfer-right";
			text = "";
			//highlight = highlight || TODO; // todo
		}*/ else if (text == "...") {
			icon = "dots-vertical";
			text = "";
			//highlight = highlight || leftPanelShow;
		}
		const highlightOrHovered = highlight || hovered;

		if (textComp == null) {
			textComp = enabled
				? <Text style={E(
					{position: "relative", overflow: "hidden", textOverflow: "ellipsis"},
					{fontSize: [null, 10, 10, 8][sizeIndex]},
				)}>{text}</Text>
				: <InfoButton text={disabledInfo!}/>;
		}
		const textAfter = toolbarRatingPreviews != RatingPreviewType.chart || highlightOrHovered;

		const showLeftBorder = !first || node.type == NodeType.argument;
		//const showBottomBorder = node.type != NodeType.argument || node.current.phrasing.note || node.current.attachments.length > 0;
		const showBottomBorder = false;

		const {key, css} = cssHelper(this);
		return (
			<div
				className={key("ToolBarButton", icon && `mdi mdi-icon mdi-${icon}`)}
				onMouseEnter={()=>{
					if (!enabled) return;
					setHovered(true);
					onHoverChange?.(true);
				}}
				onMouseLeave={()=>{
					if (!enabled) return;
					setHovered(false);
					onHoverChange?.(false);
				}}
				style={ES(
					{
						position: "relative", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12,
						//border: "solid rgba(0,0,0,.5)",
						border: "solid rgba(0,0,0,1)",
						borderWidth: `0 0 ${showBottomBorder ? "1px" : "0"} ${showLeftBorder ? "1px" : "0"}`,
					},
					highlightOrHovered && {background: "rgba(255,255,255,.2)"},
					//!showLeftBorder && {borderRadius: "5px 0 0 0"},
					//node.type == NodeType.argument && {marginRight: -5},
					//last && {borderRadius: "0 5px 0 0"},
					icon == null && {
						// normally we try to keep all toolbar-buttons the same width, but with limited space, use flexible width based on text-length
						flex: [50, 50, text.length, text.length][sizeIndex],
						minWidth: TOOLBAR_BUTTON_WIDTH, // probably temp
					},
					icon && {
						//width: icon == "transfer-left" ? 40 : 25,
						width: icon == "transfer-left" ? [35, 25, 20, 15][sizeIndex] : [30, 25, 20, 15][sizeIndex],
						fontSize: 16,
					},
					//(panel == "truth" || panel == "relevance") && {alignItems: "flex-start", fontSize: 10},
					(panel == "truth" || panel == "relevance") && !highlightOrHovered && toolbarRatingPreviews != RatingPreviewType.none && {
						color: `rgba(255,255,255,${toolbarRatingPreviews == RatingPreviewType.bar_average ? .2 : .15})`,
					},
					GADDemo && {color: HSLA(222, 0.33, 0.25, 1), fontFamily: SLSkin.main.MainFont() /*fontSize: 15, letterSpacing: 1*/},
					//(panel == "truth" || panel == "relevance") && {color: "transparent"},
					style,
				)}
				onClick={e=>{
					if (!enabled) return;
					if (onClick) onClick(e);
					if (panel) {
						onPanelButtonClick(panel);
					}
				}}
			>
				{!textAfter && textComp}
				{enabled && (panel == "truth" || panel == "relevance") &&
				<RatingsPreviewBackground {...this.props} path={path} node={node} ratingType={panel as NodeRatingType}/>}
				{textAfter && textComp}
			</div>
		);
	}
}

@Observer
export class RatingsPreviewBackground extends BaseComponent<{path: string, node: NodeL3, ratingType: NodeRatingType} & NodeToolbar_SharedProps, {}> {
	render() {
		const {path, node, ratingType, backgroundColor} = this.props;
		if (store.main.maps.toolbarRatingPreviews == RatingPreviewType.none) return null;

		const ratingTypeInfo = GetRatingTypeInfo(ratingType);
		/*const ratings = GetRatings(ratingNode.id, ratingType);
		const ratingsInEachRange = ratingTypeInfo.valueRanges.map(range=>{
			return ratings.filter(a=>RatingValueIsInRange(a.value, range));
		});*/
		const ratingSummary = GetRatingSummary(node.id, ratingType);

		/*ratingsPreview = (
			<Row style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
				{ratingTypeInfo.valueRanges.map((range, index)=>{
					const ratingsInRange = ratingsInEachRange[index];
					const ratingsInRange_relativeToMax = ratingsInRange.length / ratingsInEachRange.map(a=>a.length).Max();
					return <div style={{
						flex: 1,
						background: "red",
						height: ratingsInRange_relativeToMax.ToPercentStr(),
					}}/>;
				})}
			</Row>
		);*/
		if (store.main.maps.toolbarRatingPreviews == RatingPreviewType.chart) {
			//if (ratings.length == 0) return null;

			/*const nodeColor = GetNodeColor(node, "raw");
			const redNodeColor = GetNodeColor({type: NodeType.argument, displayPolarity: Polarity.opposing} as NodeL3, "raw");*/
			const redNodeBackgroundColor = GetNodeColor({type: NodeType.argument, displayPolarity: Polarity.opposing} as NodeL3, "background");

			//const baselineValue = (ratingsInEachRange.map(a=>a.length).Max() / 10).KeepAtLeast(.1);
			const baselineValue = (ratingSummary.countsByRange.Max() / 10).KeepAtLeast(.1);
			return (
				<RatingsPanel_Old node={node} path={path} ratingType={ratingType} asNodeUIOverlay={true}
					uplotData_override={[
						// for splines style
						[0, ...ratingTypeInfo.valueRanges.map(a=>a.center), 100],
						//[0, ...ratingsInEachRange.map(a=>a.length), 0],
						//[baselineValue, ...ratingsInEachRange.map(a=>a.length.KeepAtLeast(baselineValue)), baselineValue],
						[baselineValue, ...ratingSummary.countsByRange.map(a=>a.KeepAtLeast(baselineValue)), baselineValue],

						// for bars style
						/*ratingTypeInfo.valueRanges.map(a=>a.center),
						ratingSummary.countsByRange.map(a=>a.KeepAtLeast(baselineValue)),*/
					]}
					// if background is red, decrease alpha of our orange fill-color (else it shows up too prominently, relative to when the background is green, etc.)
					//customAlphaMultiplier={nodeColor.css() == redNodeColor.css() ? .5 : 1}
					//customAlphaMultiplier={backgroundColor.css() == redNodeBackgroundColor.css() ? .7 : 1}
				/>
			);
		}

		//const backgroundFillPercent = GetFillPercent_AtPath(node, path, null);
		const backgroundFillPercent = GetRatingAverage(node.id, ratingType, null) ?? 0;
		return (
			<>
				<div style={{position: "absolute", top: 0, bottom: 0, right: 0, width: `${100 - backgroundFillPercent}%`, background: "black"}}/>
				{/* chart just for the my-rating bars */}
				<RatingsPanel_Old node={node} path={path} ratingType={ratingType} asNodeUIOverlay={true}
					uplotData_override={[
						[0, ...ratingTypeInfo.valueRanges.map(a=>a.center), 100],
						//[0, ...ratingsInEachRange.map(a=>0), 0],
						[0, ...ratingSummary.countsByRange.map(a=>0), 0],
					]}
					ownRatingOpacity={.5} // increase opacity of own-rating marker (else can be hard to see near filled/unfilled border -- using a shape rather than line should make this unnecessary in future)
				/>
			</>
		);
	}
}