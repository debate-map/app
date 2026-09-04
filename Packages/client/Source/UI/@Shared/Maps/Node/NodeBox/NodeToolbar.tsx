import {GetExtractedPrefixTextInfo, GetNodeTags, GetRatingAverage, GetRatingSummary, GetRatingTypeInfo, GetToolbarItemsToShow, NodeL3, NodeRatingType, NodeType, ShouldRatingTypeBeReversed} from "dm_common";
import React, {useState} from "react";
import {store} from "Store/index.js";
import {RatingPreviewType} from "Store/main/maps.js";
import {SLMode} from "UI/@SL/SL.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {SLSkin} from "Utils/Styles/Skins/SLSkin.js";
import {HSLA, InfoButton} from "web-vcore";
import {Color} from "chroma-js";
import {E, ea} from "js-vextensions";
import {Row, Text} from "react-vcomponents";
import {RatingsPanel_Old} from "../DetailBoxes/Panels/RatingsPanel_Old.js";
import {NodeBox_Props} from "../NodeBox.js";
import {observer_mgl} from "mobx-graphlink";
import {JSX} from "react";

type NodeToolbar_Props = {
	backgroundColor: Color,
	panelToShow?: string|n,
	onPanelButtonClick: (panel: string)=>any,
	onMoreClick?: (e: any)=>any,
	onMoreHoverChange?: (hovered: boolean)=>any,
	nodeUI_width_final: number,
	leftPanelShow: boolean,
} & NodeBox_Props;

export type NodeToolbar_SharedProps = NodeToolbar_Props & {buttonCount: number}

export const NodeToolbar = observer_mgl((props: NodeToolbar_Props)=>{
	const {map, node, path, backgroundColor} = props;

	const sharedProps = E(props, {buttonCount: 1}); // button-count is updated shortly

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
					const allLabelsText = labels.join("   "); // gap = ~3chars
					const fontSize = allLabelsText.length >= 30 ? 9 :
						allLabelsText.length >= 15 ? 10 :
						11;
					return <ToolBarButton key={index} {...sharedProps} first={indexAmongEnabled++ == 0} panel="tags" style={{overflow: "hidden"}}
						text={allLabelsText} // used for estimating width-required for button
						textComp={
							<Row style={{
								width: "100%", fontSize, flexWrap: "wrap", justifyContent: "center",
								gap: "1px 5px", // use gap of 1, to compensate for {mt:-1,mb:-1} of items, such that they only overlap 1px
								alignItems: "initial", // don't use centering of items, else messes up margins (rely on centering of this container as a whole)
							}}>
								{labels.map((label, labelI)=>{
									return <Text key={labelI} mt={-1} mb={-1} p="0 5px"
										style={E(
											{display: "inline-block", background: HSLA(0, 0, 1, .3), borderRadius: 5, cursor: "pointer"},
											SLMode && {
												background: "transparent", border: "1px solid rgba(43,55,85,.7)", color: "rgba(43,55,85,1)",
											},
										)}>
											{label as any}
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
	sharedProps.buttonCount = toolbarItemsToShow.length; // todo: confirm this is correct (eg. confirm prefix-button is supposed to be included)
	const extractedPrefixTextInfo = GetExtractedPrefixTextInfo(node, path, map);
	const showBottomBorder = node.type == NodeType.argument ? (node.current.phrasing.note || node.current.attachments.length > 0) : true;

	return (
		<>
			{toolbarItemsToShow.Any(a=>a.panel == "prefix") &&
			<div className={["NodeToolbar", "useLightText", "NodeToolbar_prefix", showBottomBorder && "NodeToolbar_bordered"].filter(a=>a).join(" ")}
				style={{background: backgroundColor.css(), color: liveSkin.NodeTextColor().alpha(SLMode ? 1 : .4).css()}}>
				<ToolBarButton {...sharedProps} first={true} last={true} text={extractedPrefixTextInfo?.bracketedText ?? "n/a"} panel="extractedPrefixText" enabled={false}/>
			</div>}
			<div className={[
				"NodeToolbar", "useLightText",
				node.type == NodeType.argument ? "NodeToolbar_argument" : "NodeToolbar_above",
				showBottomBorder && "NodeToolbar_bordered",
			].filter(a=>a).join(" ")}
				style={{background: backgroundColor.css(), color: liveSkin.NodeTextColor().alpha(SLMode ? 1 : .4).css()}}>
				{getStandardToolbarItemUIs()}
			</div>
		</>
	);
});

type ToolBarButton_Props = {
	node: NodeL3,
	text: string,
	textComp?: JSX.Element,
	enabled?: boolean,
	disabledInfo?: string,
	panel?: string,
	first?: boolean,
	last?: boolean,
	panelToShow?: string|n,
	onPanelButtonClick: (panel: string)=>any,
	onClick?: (e: React.MouseEvent)=>any,
	onHoverChange?: (hovered: boolean)=>any,
	leftPanelShow: boolean,
	style?: any,
} & NodeToolbar_SharedProps;

export const ToolBarButton = observer_mgl((props: ToolBarButton_Props)=>{
	let {node, path, text, textComp, enabled = true, disabledInfo, panel, first, panelToShow, onPanelButtonClick, onClick, onHoverChange, nodeUI_width_final, leftPanelShow, style, buttonCount} = props;
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
		icon = "transfer-left";
		text = "";
		highlight = highlight || leftPanelShow;
	} else if (text == "...") {
		icon = "dots-vertical";
		text = "";
	}
	const highlightOrHovered = highlight || hovered;

	if (textComp == null) {
		textComp = (
			<span className="ToolBarButton_textContent" style={{fontSize: [undefined, 10, 10, 8][sizeIndex]}}>{text}</span>
		);
		if (!enabled && disabledInfo != null) {
			textComp = <InfoButton text={disabledInfo!}/>;
		}
	}
	const textAfter = toolbarRatingPreviews != RatingPreviewType.chart || highlightOrHovered;

	const showLeftBorder = !first || (node.type == NodeType.argument && panel != "extractedPrefixText"); // extracted-prefix-text button is always left-most, so has no left-border

	return (
		<div
			className={[
				"ToolBarButton",
				icon && `mdi mdi-icon mdi-${icon}`,
				showLeftBorder && "ToolBarButton_leftBorder",
				icon == null && "ToolBarButton_text",
				panel == "extractedPrefixText" && "ToolBarButton_prefix",
			].filter(a=>a).join(" ")}
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
			style={E(
				highlightOrHovered && {background: "rgba(255,255,255,.2)"},
				icon == null && {
					// normally we try to keep all toolbar-buttons the same width, but with limited space, use flexible width based on text-length
					flex: [50, 50, text.length, text.length][sizeIndex],
				},
				icon && {
					fontSize: 16,
				},
				(panel == "truth" || panel == "relevance") && !highlightOrHovered && toolbarRatingPreviews != RatingPreviewType.none && {
					color: `rgba(255,255,255,${toolbarRatingPreviews == RatingPreviewType.bar_average ? .2 : .15})`,
				},
				SLMode && {color: HSLA(222, 0.33, 0.25, 1), fontFamily: SLSkin.main.MainFont()},
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
			<RatingsPreviewBackground {...props} path={path} node={node} ratingType={panel as NodeRatingType}/>}
			{textAfter && textComp}
		</div>
	);
});

type RatingsPreviewBackground_Props = {
	path: string,
	node: NodeL3,
	ratingType: NodeRatingType
} & NodeToolbar_SharedProps;

export const RatingsPreviewBackground = observer_mgl((props: RatingsPreviewBackground_Props)=>{
	const {path, node, ratingType} = props;
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
});
