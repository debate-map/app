import {GetExtractedPrefixTextInfo, GetNodeForm, GetNodeL3, GetNodeTags, GetRatingAverage, GetRatingSummary, GetRatingTypeInfo, GetToolbarItemsToShow, Map, NodeL3, NodeRatingType, NodeType, Polarity, ShouldRatingTypeBeReversed, ShowNodeToolbar} from "dm_common";
import React, {useState} from "react";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {store} from "Store/index.js";
import {RatingPreviewType} from "Store/main/maps.js";
import {SLMode} from "UI/@SL/SL.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {SLSkin} from "Utils/Styles/Skins/SLSkin.js";
import {DefaultLoadingUI, ES, HSLA, InfoButton, Observer} from "web-vcore";
import {Color} from "web-vcore/nm/chroma-js.js";
import {E, ea} from "web-vcore/nm/js-vextensions";
import {BailInfo, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {Row, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponent, cssHelper} from "web-vcore/nm/react-vextensions.js";
import {RatingsPanel_Old} from "../DetailBoxes/Panels/RatingsPanel_Old.js";
import {TOOLBAR_BUTTON_WIDTH, TOOLBAR_HEIGHT_BASE} from "../NodeLayoutConstants.js";
import {NodeBox_Props} from "../NodeBox.js";

//export type NodeToolbar_SharedProps = NodeBox_Props & {backgroundColor: Color};
export type NodeToolbar_Props = {
	backgroundColor: Color, panelToShow?: string|n, onPanelButtonClick: (panel: string)=>any,
	onMoreClick?: (e: any)=>any, onMoreHoverChange?: (hovered: boolean)=>any,
	nodeUI_width_final: number,
	leftPanelShow: boolean,
} & NodeBox_Props;
export type NodeToolbar_SharedProps = NodeToolbar_Props & {buttonCount: number}

@Observer
export class NodeToolbar extends BaseComponent<NodeToolbar_Props, {}> {
	/*loadingUI = (info: BailInfo)=>{
		if (this.props.node.id == "3Td4YWzQRGqxCEtDpA3EbQ") {
			console.log(info.bailMessage, info.comp);
		}
		return <DefaultLoadingUI comp={info.comp} bailMessage={info.bailMessage} style={{display: "none"}}/>;
	};*/
	render() {
		const {map, node, path, backgroundColor, panelToShow, onPanelButtonClick, onMoreClick, onMoreHoverChange, nodeUI_width_final, leftPanelShow} = this.props;
		const parentPath = SlicePath(path, 1);
		const parent = GetNodeL3(parentPath);
		const nodeForm = GetNodeForm(node, path);

		//const sharedProps = {node, panelToShow, onPanelButtonClick, leftPanelShow};
		const sharedProps = E(this.props, {buttonCount: 1}); // button-count is updated shortly
		const {key, css} = cssHelper(this);

		const toolbarItemsToShow = GetToolbarItemsToShow(node, path, map);
		const tags = GetNodeTags.CatchBail(ea, node.id);
		const labels = tags.filter(a=>a.labels != null).SelectMany(a=>a.labels!.labels).Distinct();
		// exclude clone-history tags because they're auto-created (ie. not relevant for readers, nor for most manual curation work)
		const labelsAndOtherTags = labels.length + tags.filter(a=>a.labels == null && a.cloneHistory == null).length;
		// "standard toolbar items" meaning "all except the pseudo-toolbar-item potentially anchored to the left to display the node's extracted-prefix-text"
		const getStandardToolbarItemUIs = ()=>{
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
												SLMode && {
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
		//sharedProps.buttonCount = getStandardToolbarItemUIs().filter(a=>a != null).length;
		sharedProps.buttonCount = toolbarItemsToShow.length; // todo: confirm this is correct (eg. confirm prefix-button is supposed to be included)

		/*const [contextMenuOpen, setContextMenuOpen] = useState(false);
		const processedMouseEvents = useMemo(()=>new WeakSet<MouseEvent>(), []); // use WeakSet, so storage about event can be dropped after its processing-queue completes
		UseDocumentEventListener("click", e=>!processedMouseEvents.has(e) && setContextMenuOpen(false));*/

		const extractedPrefixTextInfo = GetExtractedPrefixTextInfo(node, path, map);
		const showBottomBorder =
			node.type == NodeType.argument ? (node.current.phrasing.note || node.current.attachments.length > 0) :
			true;
		return (
			<>
				{/*extractedPrefixTextInfo?.extractLocation == "toolbar" &&*/}
				{toolbarItemsToShow.Any(a=>a.panel == "prefix") &&
				<Row className={key("NodeToolbar useLightText")} style={css(
					{
						height: TOOLBAR_HEIGHT_BASE, background: backgroundColor.css(), borderRadius: "5px 5px 0 0",
						color: liveSkin.NodeTextColor().alpha(SLMode ? 1 : .4).css(),
						position: "absolute", bottom: "100%", left: 0,
					},
					showBottomBorder && {
						borderBottom: "1px solid black",
						boxSizing: "content-box", // needed for border to not cut into content (to be consistent with height of the regular right-anchored toolbar section)
					},
				)}>
					<ToolBarButton {...sharedProps} first={true} last={true} text={extractedPrefixTextInfo?.bracketedText ?? "n/a"} panel="extractedPrefixText" enabled={false}/>
				</Row>}
				<Row className={key("NodeToolbar useLightText")} style={css(
					{
						height: TOOLBAR_HEIGHT_BASE, background: backgroundColor.css(), borderRadius: "5px 5px 0 0",
						color: liveSkin.NodeTextColor().alpha(SLMode ? 1 : .4).css(),
						//minWidth: 250, // temp
					},
					node.type == NodeType.argument && {
						position: "relative", // needed to show above
					},
					node.type != NodeType.argument && {
						position: "absolute", bottom: "100%", right: -17, // extend 17px past right edge, to account for +/- button below
					},
					showBottomBorder && {
						borderBottom: "1px solid black",
						boxSizing: "content-box", // needed for border to not cut into content (eg. making ratings-preview look inconsistent)
					},
				)}>
					{getStandardToolbarItemUIs()}
				</Row>
			</>
		);
	}
}

@Observer
class ToolBarButton extends BaseComponent<{
	node: NodeL3, text: string, textComp?: JSX.Element, enabled?: boolean, disabledInfo?: string, panel?: string,
	first?: boolean, last?: boolean, panelToShow?: string|n, onPanelButtonClick: (panel: string)=>any,
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
			textComp = (
				<Text style={E(
					{position: "relative", overflow: "hidden", textOverflow: "ellipsis"},
					{fontSize: [null, 10, 10, 8][sizeIndex]},
				)}>{text}</Text>
			);
			if (!enabled && disabledInfo != null) {
				textComp = <InfoButton text={disabledInfo!}/>;
			}
		}
		const textAfter = toolbarRatingPreviews != RatingPreviewType.chart || highlightOrHovered;

		const showLeftBorder = !first || (node.type == NodeType.argument && panel != "extractedPrefixText"); // extracted-prefix-text button is always left-most, so has no left-border
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
						boxSizing: "content-box", // needed for border to not cut into content (eg. making ratings-preview look inconsistent)
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
					// atm, toolbar-buttons are always displayed with the same size, so just set it so explicitly
					{width: TOOLBAR_BUTTON_WIDTH, height: TOOLBAR_HEIGHT_BASE},
					//(panel == "truth" || panel == "relevance") && {alignItems: "flex-start", fontSize: 10},
					(panel == "truth" || panel == "relevance") && !highlightOrHovered && toolbarRatingPreviews != RatingPreviewType.none && {
						color: `rgba(255,255,255,${toolbarRatingPreviews == RatingPreviewType.bar_average ? .2 : .15})`,
					},
					panel == "extractedPrefixText" && {
						//position: "absolute", left: 0,
						padding: "0 10px",
						// if we're showing prefix-text here, only set a min-width; while this can the layout system some imperfection (it expects fixed-widths), it's better than cutting off the prefix-text
						width: null,
						minWidth: TOOLBAR_BUTTON_WIDTH, // probably temp
					},
					SLMode && {color: HSLA(222, 0.33, 0.25, 1), fontFamily: SLSkin.main.MainFont() /*fontSize: 15, letterSpacing: 1*/},
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
		const ratingSummary = GetRatingSummary(node.id, ratingType);
		const reverseRatings = ShouldRatingTypeBeReversed(node, ratingType);

		if (store.main.maps.toolbarRatingPreviews == RatingPreviewType.chart) {
			const baselineValue = (ratingSummary.countsByRange.Max() / 10).KeepAtLeast(.1);
			const ratingValues = ratingSummary.countsByRange.map(a=>a.KeepAtLeast(baselineValue));
			const ratingValues_final = reverseRatings ? ratingValues.slice().reverse() : ratingValues;

			return (
				<RatingsPanel_Old node={node} path={path} ratingType={ratingType} asNodeUIOverlay={true}
					uplotData_override={[
						// for splines style
						[0, ...ratingTypeInfo.valueRanges.map(a=>a.center), 100],
						[baselineValue, ...ratingValues_final, baselineValue],

						// for bars style
						/*ratingTypeInfo.valueRanges.map(a=>a.center),
						ratingSummary.countsByRange.map(a=>a.KeepAtLeast(baselineValue)),*/
					]}
				/>
			);
		}

		//const backgroundFillPercent = GetFillPercent_AtPath(node, path, null);
		const backgroundFillPercent = GetRatingAverage(node.id, ratingType, null) ?? 0;
		const backgroundFillPercent_final = reverseRatings ? 100 - backgroundFillPercent : backgroundFillPercent;
		return (
			<>
				<div style={{position: "absolute", top: 0, bottom: 0, right: 0, width: `${100 - backgroundFillPercent_final}%`, background: "black"}}/>
				{/* chart just for the my-rating bars */}
				<RatingsPanel_Old node={node} path={path} ratingType={ratingType} asNodeUIOverlay={true}
					uplotData_override={[
						[0, ...ratingTypeInfo.valueRanges.map(a=>a.center), 100],
						[0, ...ratingSummary.countsByRange.map(a=>0), 0],
					]}
					ownRatingOpacity={.5} // increase opacity of own-rating marker (else can be hard to see near filled/unfilled border -- using a shape rather than line should make this unnecessary in future)
				/>
			</>
		);
	}
}