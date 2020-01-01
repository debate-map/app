import chroma from "chroma-js";
import {E} from "js-vextensions";
import {Button, Span} from "react-vcomponents";
import {BaseComponent, BaseComponentWithConnector, BaseComponentPlus} from "react-vextensions";
import {IsUserCreatorOrMod} from "Store/firebase/userExtras";
import {MeID} from "Store/firebase/users";
import {MapNodeView, GetNodeView} from "Store/main/maps/mapViews/$mapView";
import {SlicePath} from "mobx-firelink";
import {Observer} from "vwebapp-framework";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {GetRatingAverage_AtPath, GetRatings} from "../../../../Store/firebase/nodeRatings";
import {RatingsRoot} from "../../../../Store/firebase/nodeRatings/@RatingsRoot";
import {GetRatingTypeInfo, RatingType} from "../../../../Store/firebase/nodeRatings/@RatingType";
import {GetParentNodeL3} from "../../../../Store/firebase/nodes";
import {GetNodeForm, GetRatingTypesForNode, IsPremiseOfSinglePremiseArgument} from "../../../../Store/firebase/nodes/$node";
import {ClaimForm, MapNodeL3} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeType_Info} from "../../../../Store/firebase/nodes/@MapNodeType";

type Props = {
	map: Map, path: string, node: MapNodeL3, ratingsRoot: RatingsRoot,
	panelPosition?: "left" | "below", local_openPanel?: string,
	backgroundColor: chroma.Color, asHover: boolean, inList?: boolean, style?,
	onPanelButtonHover: (panel: string)=>void, onPanelButtonClick: (panel: string)=>void,
};
@Observer
export class MapNodeUI_LeftBox extends BaseComponentPlus({panelPosition: "left"} as Props, {}) {
	render() {
		const {
			map, path, node, ratingsRoot,
			panelPosition, local_openPanel,
			backgroundColor, asHover, inList, onPanelButtonHover, onPanelButtonClick, style,
			children,
		} = this.props;
		const nodeView = GetNodeView(map._key, path);
		const openPanel = local_openPanel || nodeView?.openPanel;

		const form = GetNodeForm(node, path);
		const parentNode = GetParentNodeL3(path);

		const nodeReversed = form == ClaimForm.Negation;
		const nodeTypeInfo = MapNodeType_Info.for[node.type];

		const combinedWithParent = IsPremiseOfSinglePremiseArgument(node, parentNode);
		if (combinedWithParent) {
			var argumentNode = parentNode;
			var argumentPath = SlicePath(path, 1);
		}

		let ratingTypes = GetRatingTypesForNode(node);
		if (argumentNode) {
			// ratingTypes = [{type: "impact" as RatingType, main: true}].concat(ratingTypes).concat([{type: "relevance" as RatingType, main: true}]);
			ratingTypes = ratingTypes.concat([{type: "relevance" as RatingType}, {type: "impact" as RatingType, main: true}]);
		}

		return (
			<div className="NodeUI_LeftBox" style={E(
				{display: "flex", flexDirection: "column", whiteSpace: "nowrap", zIndex: asHover ? 6 : 5},
				!inList && panelPosition == "left" && {position: "absolute", right: "calc(100% + 1px)"},
				!inList && panelPosition == "below" && {position: "absolute", top: "calc(100% + 1px)", width: 130},
				style,
			)}>
				{children}
				<div style={{position: "relative", background: backgroundColor.alpha(0.95).css(), borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px"}}>
					{ratingTypes.map((ratingInfo, index)=>{
						const nodeForRatingType = combinedWithParent && ["impact", "relevance"].Contains(ratingInfo.type) ? argumentNode : node;
						const pathForRatingType = combinedWithParent && ["impact", "relevance"].Contains(ratingInfo.type) ? argumentPath : path;
						const parentNodeForRatingType = GetParentNodeL3(pathForRatingType);

						const ratingTypeInfo = GetRatingTypeInfo(ratingInfo.type, nodeForRatingType, parentNodeForRatingType, pathForRatingType);
						// let ratingSet = ratingsRoot && ratingsRoot[ratingType];

						let percentStr = "...";
						const ratings = GetRatings(nodeForRatingType._key, ratingInfo.type);
						const average = GetRatingAverage_AtPath(nodeForRatingType, ratingInfo.type, null, -1);
						if (average != -1) {
							percentStr = `${average}%`;
						}
						return (
							<PanelButton key={ratingInfo.type} {...{onPanelButtonHover, onPanelButtonClick, map, path: pathForRatingType, openPanel}}
								panel={ratingInfo.type} text={ratingTypeInfo.displayText} style={E(index == 0 && {marginTop: 0, borderRadius: "5px 5px 0 0"})}>
								<Span ml={5} style={{float: "right"}}>
									{percentStr}
									<sup style={{whiteSpace: "pre", top: -5, marginRight: -3, marginLeft: 1, fontSize: 10}}>
										{/* ratingSet ? ratingSet.VKeys().length /*- 1*#/ : 0 */}
										{ratings.length}
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
				<div style={{position: "relative", marginTop: 1, background: "rgba(0,0,0,.8)", borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px"}}>
					<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: backgroundColor.alpha(0.7).css()}}/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="phrasings" text="Phrasings"
						style={{marginTop: 0, borderRadius: "5px 5px 0 0"}}/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="definitions" text="Definitions"/>
					{/* <PanelButton {...{ onPanelButtonHover, onPanelButtonClick, map, path, openPanel }} panel="discussion" text="Discussion"/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="social" text="Social"/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="tags" text="Tags"/> */}
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="details"
						text={`Details${IsUserCreatorOrMod(MeID(), node) ? " (edit)" : ""}`}/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="history" text="History"/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="others" text="Others"/>
					<Button text="..."
						style={{
							margin: "-1px 0 1px 0", height: 17, lineHeight: "12px", padding: 0,
							position: "relative", display: "flex", justifyContent: "space-around", // alignItems: "center",
							background: null, boxShadow: null, border: null,
							borderRadius: "0 0 5px 5px",
							":hover": {background: backgroundColor.alpha(0.5).css()},
						}}/>
				</div>
			</div>
		);
	}
}

type PanelButton_Props = {
	map: Map, path: string, openPanel: string, panel: string, text: string, style?,
	onPanelButtonHover: (panel: string)=>void, onPanelButtonClick: (panel: string)=>void,
};
class PanelButton extends BaseComponent<PanelButton_Props, {}> {
	render() {
		const {map, path, openPanel, panel, text, style, children} = this.props;
		return (
			<Button text={text}
				style={E(
					{position: "relative", display: "flex", justifyContent: "space-between", padding: "3px 7px"},
					{
						// border: "1px outset rgba(0,0,0,.35)",
						border: "solid rgba(0,0,0,.4)", borderWidth: "0 0 1px 0",
						boxShadow: "none", borderRadius: 0,
						backgroundColor: "rgba(255,255,255,.1)", ":hover": {backgroundColor: "rgba(255,255,255,.2)"},
					},
					openPanel == panel && {backgroundColor: "rgba(255,255,255,.2)"},
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