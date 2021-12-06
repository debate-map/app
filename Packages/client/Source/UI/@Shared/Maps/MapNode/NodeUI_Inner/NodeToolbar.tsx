import {ChildGroup, ClaimForm, GetArgumentNode, GetNodeForm, GetNodeL3, GetParentNode, GetParentPath, GetRatingAverage, GetRatingSummary, GetRatingTypeInfo, IsPremiseOfSinglePremiseArgument, MapNodeL3, MapNodeType, NodeRatingType, Polarity} from "dm_common";
import React, {useMemo, useState} from "react";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {store} from "Store/index.js";
import {RatingPreviewType} from "Store/main/maps.js";
import {ES, InfoButton, Observer, UseDocumentEventListener} from "web-vcore";
import {Color} from "web-vcore/nm/chroma-js.js";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {Row, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VMenuUI} from "web-vcore/nm/react-vmenu";
import {RatingsPanel_Old} from "../DetailBoxes/Panels/RatingsPanel_Old.js";
import {NodeUI_Inner_Props} from "../NodeUI_Inner.js";
import {NodeUI_Menu} from "../NodeUI_Menu.js";

//export type NodeToolbar_SharedProps = NodeUI_Inner_Props & {backgroundColor: Color};
export type NodeToolbar_Props = {
	backgroundColor: Color, panelToShow?: string, onPanelButtonClick: (panel: string)=>any,
	onMoreClick?: (e: any)=>any, onMoreHoverChange?: (hovered: boolean)=>any,
	leftPanelShow: boolean,
} & NodeUI_Inner_Props;

export class NodeToolbar extends BaseComponent<NodeToolbar_Props, {}> {
	render() {
		const {map, node, path, backgroundColor, panelToShow, onPanelButtonClick, onMoreClick, onMoreHoverChange, leftPanelShow} = this.props;
		const [contextMenuOpen, setContextMenuOpen] = useState(false);
		const parentPath = SlicePath(path, 1);
		const parent = GetNodeL3(parentPath);
		const nodeForm = GetNodeForm(node, path);
		const isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);

		const processedMouseEvents = useMemo(()=>new WeakSet<MouseEvent>(), []); // use WeakSet, so storage about event can be dropped after its processing-queue completes
		UseDocumentEventListener("click", e=>!processedMouseEvents.has(e) && setContextMenuOpen(false));

		//const sharedProps = {node, panelToShow, onPanelButtonClick, leftPanelShow};
		const sharedProps = this.props;
		return (
			<Row mt={1} style={{position: "relative", height: 25, background: backgroundColor, borderRadius: "0 0 5px 5px"}}>
				<ToolBarButton {...sharedProps} text="<<" first={true} onClick={onMoreClick} onHoverChange={onMoreHoverChange}/>
				{(node.type == MapNodeType.claim || node.type == MapNodeType.argument) &&
				<ToolBarButton {...sharedProps} text="Agreement" panel="truth"
					enabled={node.type == MapNodeType.claim} disabledInfo="This is a multi-premise argument; after expanding it, you can give your truth/agreement ratings for its individual premises."/>}
				{((node.type == MapNodeType.claim && nodeForm != ClaimForm.question) || node.type == MapNodeType.argument) &&
				<ToolBarButton {...sharedProps} text="Relevance" panel="relevance"
					enabled={node.type == MapNodeType.argument || isPremiseOfSinglePremiseArg} disabledInfo="This is a premise for a multi-premise argument; relevance ratings should be given for the argument overall, rather than its individual premises."/>}
				<ToolBarButton {...sharedProps} text="Phrasings" panel="phrasings"/>
				<ToolBarButton {...sharedProps} text="..." last={true} onClick={e=>{
					processedMouseEvents.add(e.nativeEvent);
					setContextMenuOpen(!contextMenuOpen);
				}}/>
				{contextMenuOpen &&
				<div style={{position: "relative"}}>
					<VMenuUI style={{left: -30, top: "100%"}} onOtherVMenuOpen={()=>setContextMenuOpen(false)}>
						<NodeUI_Menu map={map} node={node} path={path} childGroup={ChildGroup.generic}/>
					</VMenuUI>
				</div>}
			</Row>
		);
	}
}

@Observer
class ToolBarButton extends BaseComponent<{
	node: MapNodeL3, text: string, enabled?: boolean, disabledInfo?: string, panel?: string,
	first?: boolean, last?: boolean, panelToShow?: string, onPanelButtonClick: (panel: string)=>any,
	onClick?: (e: React.MouseEvent)=>any, onHoverChange?: (hovered: boolean)=>any,
	leftPanelShow: boolean,
} & NodeToolbar_Props, {}> {
	render() {
		let {node, path, text, enabled = true, disabledInfo, panel, first, last, panelToShow, onPanelButtonClick, onClick, onHoverChange, leftPanelShow} = this.props;
		const [hovered, setHovered] = useState(false);
		let highlight = panel && panelToShow == panel;
		const {toolbarRatingPreviews} = store.main.maps;

		let icon: string|n;
		if (text == "<<") {
			//icon = "chevron-double-left";
			//icon = "dots-vertical";
			icon = "transfer-left";
			text = "";
			highlight = highlight || leftPanelShow;
		} else if (text == "...") {
			icon = "dots-vertical";
			text = "";
			//highlight = highlight || leftPanelShow;
		}
		const highlightOrHovered = highlight || hovered;

		const textComp = enabled
			? <Text style={{position: "relative"}}>{text}</Text>
			: <InfoButton text={disabledInfo!}/>;
		const textAfter = toolbarRatingPreviews != RatingPreviewType.chart || highlightOrHovered;

		return (
			<div
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
				className={icon ? `mdi mdi-icon mdi-${icon}` : undefined}
				style={ES(
					{
						position: "relative", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12,
						//border: "solid rgba(0,0,0,.5)",
						border: "solid rgba(0,0,0,1)",
					},
					highlightOrHovered && {background: "rgba(255,255,255,.2)"},
					first && {borderWidth: "1px 0 0 0", borderRadius: "0px 0px 0 5px"},
					!first && {borderWidth: "1px 0 0 1px"},
					icon == null && {flex: 50, borderWidth: "1px 0 0 1px"},
					icon && {
						//width: icon == "transfer-left" ? 40 : 25,
						width: icon == "transfer-left" ? 35 : 30,
						fontSize: 16,
					},
					//(panel == "truth" || panel == "relevance") && {alignItems: "flex-start", fontSize: 10},
					(panel == "truth" || panel == "relevance") && !highlightOrHovered && toolbarRatingPreviews != RatingPreviewType.none && {
						color: `rgba(255,255,255,${toolbarRatingPreviews == RatingPreviewType.bar_average ? .2 : .1})`,
					},
					//(panel == "truth" || panel == "relevance") && {color: "transparent"},
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
export class RatingsPreviewBackground extends BaseComponent<{path: string, node: MapNodeL3, ratingType: NodeRatingType} & NodeToolbar_Props, {}> {
	render() {
		const {path, node, ratingType, backgroundColor} = this.props;
		if (store.main.maps.toolbarRatingPreviews == RatingPreviewType.none) return null;

		const parentNode = GetParentNode(path);
		const argumentNode = GetArgumentNode(node, parentNode);
		const argumentPath = argumentNode == null ? null : (argumentNode == node ? path : GetParentPath(path));

		const ratingNodePath = ratingType == "relevance" ? argumentPath! : path;
		const ratingNode = GetNodeL3(ratingNodePath);
		if (ratingNode == null) return null; // why does this happen sometimes?

		const ratingTypeInfo = GetRatingTypeInfo(ratingType);
		/*const ratings = GetRatings(ratingNode.id, ratingType);
		const ratingsInEachRange = ratingTypeInfo.valueRanges.map(range=>{
			return ratings.filter(a=>RatingValueIsInRange(a.value, range));
		});*/
		const ratingSummary = GetRatingSummary(ratingNode.id, ratingType);

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
			const redNodeColor = GetNodeColor({type: MapNodeType.argument, displayPolarity: Polarity.opposing} as MapNodeL3, "raw");*/
			const redNodeBackgroundColor = GetNodeColor({type: MapNodeType.argument, displayPolarity: Polarity.opposing} as MapNodeL3, "background");

			//const baselineValue = (ratingsInEachRange.map(a=>a.length).Max() / 10).KeepAtLeast(.1);
			const baselineValue = (ratingSummary.countsByRange.Max() / 10).KeepAtLeast(.1);
			return (
				<RatingsPanel_Old node={ratingNode} path={path} ratingType={ratingType} asNodeUIOverlay={true}
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
					// if background is red, decrease alpha of our orange fill-color (else it shows up too prominently, relative to when the background is green, blue, etc.)
					//customAlphaMultiplier={nodeColor.css() == redNodeColor.css() ? .5 : 1}
					customAlphaMultiplier={backgroundColor.css() == redNodeBackgroundColor.css() ? .7 : 1}
				/>
			);
		}

		//const backgroundFillPercent = GetFillPercent_AtPath(ratingNode, ratingNodePath, null);
		const backgroundFillPercent = GetRatingAverage(ratingNode.id, ratingType, null) ?? 0;
		return (
			<>
				<div style={{position: "absolute", top: 0, bottom: 0, right: 0, width: `${100 - backgroundFillPercent}%`, background: "black"}}/>
				{/* chart just for the my-rating bars */}
				<RatingsPanel_Old node={ratingNode} path={path} ratingType={ratingType} asNodeUIOverlay={true}
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