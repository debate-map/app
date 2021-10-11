import {Color} from "chroma-js";
import {ClaimForm, GetArgumentNode, GetNodeForm, GetNodeID, GetNodeL3, GetParentNode, GetParentPath, GetRatings, GetRatingTypeInfo, IsPremiseOfSinglePremiseArgument, MapNode, MapNodeL3, MapNodeType, NodeRatingType, RatingValueIsInRange} from "dm_common";
import React, {useState} from "react";
import {ES, InfoButton, Observer} from "web-vcore";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {Row, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {RatingsPanel_Old} from "../DetailBoxes/Panels/RatingsPanel_Old.js";
import {NodeUI_Inner_Props} from "../NodeUI_Inner.js";

export class NodeToolbar extends BaseComponent<{
	backgroundColor: Color, panelToShow?: string, onPanelButtonClick: (panel: string)=>any,
	onMoreClick?: (e: any)=>any, onMoreHoverChange?: (hovered: boolean)=>any,
	leftPanelShow: boolean,
} & NodeUI_Inner_Props, {}> {
	render() {
		let {node, path, backgroundColor, panelToShow, onPanelButtonClick, onMoreClick, onMoreHoverChange, leftPanelShow} = this.props;
		const parentPath = SlicePath(path, 1);
		const parent = GetNodeL3(parentPath);
		const nodeForm = GetNodeForm(node, path);
		const isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);
		
		//const sharedProps = {node, panelToShow, onPanelButtonClick, leftPanelShow};
		const sharedProps = this.props;
		return (
			<Row mt={1} style={{position: "relative", height: 25, background: backgroundColor, borderRadius: "0 0 5px 5px"}}>
				<ToolBarButton {...sharedProps} text="<<" first={true} onClick={onMoreClick} onHoverChange={onMoreHoverChange}/>
				{(node.type == MapNodeType.claim || node.type == MapNodeType.argument) &&
				<ToolBarButton {...sharedProps} text="Agreement" panel="truth"
					enabled={node.type == MapNodeType.claim} disabledInfo="TODO"/>}
				{((node.type == MapNodeType.claim && nodeForm != ClaimForm.question) || node.type == MapNodeType.argument) &&
				<ToolBarButton {...sharedProps} text="Relevance" panel="relevance"
					enabled={node.type == MapNodeType.argument || isPremiseOfSinglePremiseArg} disabledInfo="TODO"/>}
				<ToolBarButton {...sharedProps} text="Phrasings" panel="phrasings" last={true}/>
			</Row>
		);
	}
}

@Observer
class ToolBarButton extends BaseComponent<{
	node: MapNodeL3, text: string, enabled?: boolean, disabledInfo?: string, panel?: string,
	first?: boolean, last?: boolean, panelToShow?: string, onPanelButtonClick: (panel: string)=>any,
	onClick?: (e: any)=>any, onHoverChange?: (hovered: boolean)=>any,
	leftPanelShow: boolean,
} & NodeUI_Inner_Props, {}> {
	render() {
		let {node, path, text, enabled = true, disabledInfo, panel, first, last, panelToShow, onPanelButtonClick, onClick, onHoverChange, leftPanelShow} = this.props;
		let [hovered, setHovered] = useState(false);
		let highlight = panel && panelToShow == panel;

		let icon: string|n;
		if (text == "<<") {
			//icon = "chevron-double-left";
			//icon = "dots-vertical";
			icon = "transfer-left";
			text = "";
			highlight = highlight || leftPanelShow;
		}

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
						border: "solid rgba(0,0,0,.5)",
					},
					(highlight || hovered) && {background: "rgba(255,255,255,.2)"},
					first && {borderWidth: "1px 0 0 0", borderRadius: "0px 0px 0 5px"},
					!first && {borderWidth: "1px 0 0 1px"},
					icon == null && {flex: 50, borderWidth: "1px 0 0 1px"},
					icon && {width: 40, fontSize: 16},
				)}
				onClick={e=>{
					if (!enabled) return;
					if (onClick) onClick(e);
					if (panel) {
						onPanelButtonClick(panel);
					}
				}}
			>
				{enabled && (panel == "truth" || panel == "relevance") &&
				<RatingsPreviewBackground path={path} node={node} ratingType={panel as NodeRatingType}/>}
				{enabled
					? <Text style={{position: "relative"}}>{text}</Text>
					: <InfoButton text={disabledInfo!}/>}
			</div>
		);
	}
}

@Observer
export class RatingsPreviewBackground extends BaseComponent<{path: string, node: MapNode, ratingType: NodeRatingType}, {}> {
	render() {
		let {path, node, ratingType} = this.props;
		
		const parentNode = GetParentNode(path);
		const argumentNode = GetArgumentNode(node, parentNode);
		const argumentPath = argumentNode == null ? null : (argumentNode == node ? path : GetParentPath(path));

		const ratingNodePath = ratingType == "relevance" ? argumentPath! : path;
		const ratingNodeID = GetNodeID(ratingNodePath);
		const ratingNode = GetNodeL3(ratingNodeID);
		if (ratingNode == null) return null; // why does this happen sometimes?

		const ratingTypeInfo = GetRatingTypeInfo(ratingType);
		const ratings = GetRatings(ratingNodeID, ratingType);
		const ratingsInEachRange = ratingTypeInfo.valueRanges.map(range=>{
			return ratings.filter(a=>RatingValueIsInRange(a.value, range));
		});
		if (ratings.length == 0) return null;
		
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
		return (
			<RatingsPanel_Old node={ratingNode} path={path} ratingType={ratingType} asNodeUIOverlay={true}
				/*ticks_override={
					ratingTypeInfo.valueRanges.map(a=>a.center)
					//[0].concat(ratingTypeInfo.valueRanges.map(a=>a.center)).concat(100)
				}*/
				uplotData_override={[
					ratingTypeInfo.valueRanges.map(a=>a.center),
					ratingsInEachRange.map(a=>a.length),
				]}
			/>
		);
	}
}