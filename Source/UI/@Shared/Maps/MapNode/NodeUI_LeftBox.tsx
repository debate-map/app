import {BaseComponent, BaseComponentWithConnector} from "react-vextensions";
import MapNodeUI_Inner from "./NodeUI_Inner";
import {Button, Span} from "react-vcomponents";
import {E} from "js-vextensions";
import {connect} from "react-redux";
import {CachedTransform} from "js-vextensions";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {MapNode, ClaimForm, MapNodeL2, MapNodeL3, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {RatingsRoot} from "../../../../Store/firebase/nodeRatings/@RatingsRoot";
import {MapNodeType_Info, MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {RatingType_Info, RatingType, GetRatingTypeInfo} from "../../../../Store/firebase/nodeRatings/@RatingType";
import {GetRatingAverage, GetRatings, ShouldRatingTypeBeReversed, GetRatingAverage_AtPath} from "../../../../Store/firebase/nodeRatings";
import {ACTMapNodePanelOpen} from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {GetRatingTypesForNode, GetNodeForm, GetMainRatingType, GetNodeL3, IsPremiseOfSinglePremiseArgument} from "../../../../Store/firebase/nodes/$node";
import {RootState} from "../../../../Store/index";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetParentNode, GetParentNodeL3} from "../../../../Store/firebase/nodes";
import {SlicePath} from "../../../../Frame/Database/DatabaseHelpers";
import {GetNode} from "Store/firebase/nodes";
import {SplitStringBySlash_Cached} from "Frame/Database/StringSplitCache";
import { IsUserCreatorOrMod } from "Store/firebase/userExtras";
import {GetUserID} from "Store/firebase/users";
import chroma from "chroma-js";

type Props = {
	map: Map, path: string, node: MapNodeL3, nodeView?: MapNodeView, ratingsRoot: RatingsRoot,
	panelPosition?: "left" | "below", local_openPanel?: string,
	backgroundColor: chroma.Color, asHover: boolean, inList?: boolean, style?,
	onPanelButtonHover: (panel: string)=>void, onPanelButtonClick: (panel: string)=>void,
};
let connector = (state, {node, path}: Props)=> {
	let parentNode = GetParentNodeL3(path);
	
	// probably temp; used to solve impact-rating-not-updating-in-ui issue
	// ==========
	/*let parent = GetNodeL3(SlicePath(path, 1));
	let combineWithParentArgument = ShouldNodeBeCombinedWithParent(node, parent);
	//let ratingReversed = ShouldRatingTypeBeReversed(node);

	if (combineWithParentArgument) {
		let ratingNode = parent;
		let ratingNodePath = SlicePath(path, 1);
		var impactRating_average = GetRatingAverage_AtPath(ratingNode, "impact");
		var impactRating_fillPercent = GetFillPercentForRatingType(ratingNode, ratingNodePath, "impact");
		//Log(`Node: ${node} Avg: ${impactRating_average} FillPercent: ${impactRating_fillPercent}`);
	}*/
	// ==========
	
	return {
		form: GetNodeForm(node, path),
		parentNode,
		/*impactRating_average,
		impactRating_fillPercent,*/
	};
};
@Connect(connector)
export class MapNodeUI_LeftBox extends BaseComponentWithConnector(connector, {}) {
	static defaultProps = {panelPosition: "left"};
	render() {
		let {
			map, path, node, nodeView, ratingsRoot,
			panelPosition, local_openPanel,
			backgroundColor, asHover, inList, onPanelButtonHover, onPanelButtonClick, style,
			form, parentNode, children,
		} = this.props;
		let openPanel = local_openPanel || nodeView.openPanel;

		let nodeReversed = form == ClaimForm.Negation;
		let nodeTypeInfo = MapNodeType_Info.for[node.type];

		let combinedWithParent = IsPremiseOfSinglePremiseArgument(node, parentNode);
		if (combinedWithParent) {
			var argumentNode = parentNode;
			var argumentPath = SlicePath(path, 1);
		}

		let ratingTypes = GetRatingTypesForNode(node);
		if (argumentNode) {
			//ratingTypes = [{type: "impact" as RatingType, main: true}].concat(ratingTypes).concat([{type: "relevance" as RatingType, main: true}]);
			ratingTypes = ratingTypes.concat([{type: "relevance" as RatingType}, {type: "impact" as RatingType, main: true}]);
		}

		return (
			<div style={E(
				{display: "flex", flexDirection: "column", whiteSpace: "nowrap", zIndex: asHover ? 6 : 5},
				!inList && panelPosition == "left" && {position: "absolute", right: "calc(100% + 1px)"},
				!inList && panelPosition == "below" && {position: "absolute", top: "calc(100% + 1px)", width: 130},
				style,
			)}>
				{children}
				<div style={{position: "relative", background: backgroundColor.alpha(.95).css(), borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`}}>
					{ratingTypes.map((ratingInfo, index)=> {
						let nodeForRatingType = combinedWithParent && ["impact", "relevance"].Contains(ratingInfo.type) ? argumentNode : node; 
						let pathForRatingType = combinedWithParent && ["impact", "relevance"].Contains(ratingInfo.type) ? argumentPath : path; 
						let parentNodeForRatingType = GetParentNodeL3(pathForRatingType);

						let ratingTypeInfo = GetRatingTypeInfo(ratingInfo.type, nodeForRatingType, parentNodeForRatingType, pathForRatingType);
						//let ratingSet = ratingsRoot && ratingsRoot[ratingType];

						let percentStr = "...";
						let ratings = GetRatings(nodeForRatingType._id, ratingInfo.type);
						let average = GetRatingAverage_AtPath(nodeForRatingType, ratingInfo.type, null, -1);
						if (average != -1) {
							percentStr = average + "%";
						}
						return (
							<PanelButton key={ratingInfo.type} {...{onPanelButtonHover, onPanelButtonClick, map, path: pathForRatingType, openPanel}}
									panel={ratingInfo.type} text={ratingTypeInfo.displayText} style={E(index == 0 && {marginTop: 0, borderRadius: "5px 5px 0 0"})}>
								<Span ml={5} style={{float: "right"}}>
									{percentStr}
									<sup style={{whiteSpace: "pre", top: -5, marginRight: -3, marginLeft: 1, fontSize: 10}}>
										{/*ratingSet ? ratingSet.VKeys(true).length /*- 1*#/ : 0*/}
										{ratings.length}
									</sup>
								</Span>
							</PanelButton>
						);
					})}
					<Button text="..."
						style={{
							margin: "-1px 0 1px 0", height: 17, lineHeight: "12px", padding: 0,
							position: "relative", display: "flex", justifyContent: "space-around", //alignItems: "center",
							background: null, boxShadow: null, border: null, borderRadius: "0 0 5px 5px",
							":hover": {background: backgroundColor.alpha(.5).css()},
						}}/>
				</div>
				<div style={{position: "relative", marginTop: 1, background: `rgba(0,0,0,.8)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`}}>
					<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: backgroundColor.alpha(.7).css()}}/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="definitions" text="Definitions"
						style={{marginTop: 0, borderRadius: "5px 5px 0 0"}}/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="discussion" text="Discussion"/>
					{/*<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="social" text="Social"/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="tags" text="Tags"/>*/}
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="details"
						text={"Details" + (IsUserCreatorOrMod(GetUserID(), node) ? " (edit)" : "")}/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="history" text="History"/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path, openPanel}} panel="others" text="Others"/>
					<Button text="..."
						style={{
							margin: "-1px 0 1px 0", height: 17, lineHeight: "12px", padding: 0,
							position: "relative", display: "flex", justifyContent: "space-around", //alignItems: "center",
							background: null, boxShadow: null, border: null,
							borderRadius: "0 0 5px 5px",
							":hover": {background: backgroundColor.alpha(.5).css()},
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
		let {map, path, openPanel, panel, text, style, children} = this.props;
		return (
			<Button text={text}
					style={E(
						{position: "relative", display: "flex", justifyContent: "space-between", padding: "3px 7px"},
						{
							//border: "1px outset rgba(0,0,0,.35)",
							border: "solid rgba(0,0,0,.4)", borderWidth: "0 0 1px 0",
							boxShadow: "none", borderRadius: 0,
							backgroundColor: "rgba(255,255,255,.1)", ":hover": {backgroundColor: "rgba(255,255,255,.2)"}
						},
						openPanel == panel && {backgroundColor: "rgba(255,255,255,.2)"},
						style
					)}
					onClick={()=> {
						let {onPanelButtonClick} = this.props;
						onPanelButtonClick(panel);
					}}
					onMouseEnter={()=> {
						let {onPanelButtonHover} = this.props;
						onPanelButtonHover(panel);
					}}
					onMouseLeave={()=> {
						let {onPanelButtonHover} = this.props;
						onPanelButtonHover(null);
					}}>
				{/*<div style={{position: "absolute", right: -4, width: 4, top: 0, bottom: 0}}/>*/}
				{/* capture mouse events in gap above and below self */}
				<div style={{position: "absolute", left: 0, right: 0, top: -3, bottom: -2, cursor: "inherit"}}/>
				{children}
			</Button>
		);
	}
}