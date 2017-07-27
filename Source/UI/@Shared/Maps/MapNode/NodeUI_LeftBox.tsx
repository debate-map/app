import {BaseComponent, Span} from "../../../../Frame/UI/ReactGlobals";
import MapNodeUI_Inner from "./NodeUI_Inner";
import Button from "../../../../Frame/ReactComponents/Button";
import {E} from "../../../../Frame/General/Globals_Free";
import {connect} from "react-redux";
import {CachedTransform} from "../../../../Frame/V/VCache";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {MapNode, ThesisForm, MapNodeEnhanced} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {RatingsRoot} from "../../../../Store/firebase/nodeRatings/@RatingsRoot";
import {MapNodeType_Info, MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {RatingType_Info, RatingType, GetRatingTypeInfo} from "../../../../Store/firebase/nodeRatings/@RatingType";
import {GetRatingAverage, GetRatings, TransformRatingForContext, ShouldRatingTypeBeReversed} from "../../../../Store/firebase/nodeRatings";
import {ACTMapNodePanelOpen} from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {MetaThesis_ThenType} from "../../../../Store/firebase/nodes/@MetaThesisInfo";
import {GetRatingTypesForNode, GetNodeForm, IsContextReversed, GetNodeEnhanced, GetMainRatingType} from "../../../../Store/firebase/nodes/$node";
import {RootState} from "../../../../Store/index";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetParentNode} from "../../../../Store/firebase/nodes";
import {ReverseThenType} from "../../../../Store/firebase/nodes/$node/$metaThesis";
import {SlicePath} from "../../../../Frame/Database/DatabaseHelpers";
import {GetNode} from "Store/firebase/nodes";
import {SplitStringBySlash_Cached} from "Frame/Database/StringSplitCache";

type Props = {
	map: Map, path: string, node: MapNodeEnhanced, nodeView?: MapNodeView, ratingsRoot: RatingsRoot,
	backgroundColor: string, asHover: boolean, inList?: boolean, style?,
	onPanelButtonHover: (panel: string)=>void, onPanelButtonClick: (panel: string)=>void,
} & Partial<{form: ThesisForm, parentNode: MapNodeEnhanced}>;
@Connect((state: RootState, {node, path}: Props)=>({
	form: GetNodeForm(node, path),
	parentNode: GetNodeEnhanced(GetParentNode(path), SlicePath(path, 1)),
}))
export default class MapNodeUI_LeftBox extends BaseComponent<Props, {}> {
	render() {
		let {map, path, node, nodeView, ratingsRoot, backgroundColor, asHover, inList, onPanelButtonHover, onPanelButtonClick, style, form, parentNode} = this.props;

		let nodeReversed = form == ThesisForm.Negation;
		let contextReversed = IsContextReversed(node, parentNode);
		if (node.metaThesis) {
			var thenType_final = node.metaThesis.thenType;
			if (contextReversed)
				thenType_final = ReverseThenType(thenType_final);
		}
		let nodeTypeInfo = MapNodeType_Info.for[node.type];

		return (
			<div style={E(
				{display: "flex", flexDirection: "column", whiteSpace: "nowrap", zIndex: asHover ? 6 : 5},
				!inList && {position: "absolute", right: "calc(100% + 1px)"},
				style,
			)}>
				<div style={{position: "relative", padding: 3, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`}}>
					<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${backgroundColor},.7)`}}/>
					{GetRatingTypesForNode(node).map((ratingInfo, index)=> {
						let ratingTypeInfo = GetRatingTypeInfo(ratingInfo.type, node, parentNode, path);
						//let ratingSet = ratingsRoot && ratingsRoot[ratingType];

						let percentStr = "...";
						let ratings = GetRatings(node._id, ratingInfo.type);
						let average = GetRatingAverage(node._id, ratingInfo.type, null, -1);
						if (average != -1) {
							average = TransformRatingForContext(average, ShouldRatingTypeBeReversed(ratingInfo.type, nodeReversed, contextReversed));
							if (node.metaThesis && (thenType_final == MetaThesis_ThenType.StrengthenParent || thenType_final == MetaThesis_ThenType.WeakenParent)) {
								let grandParentID = SplitStringBySlash_Cached(path).length >= 3 ? SplitStringBySlash_Cached(path).XFromLast(2).ToInt() : null;
								let grandParent = grandParentID ? GetNodeEnhanced(GetNode(grandParentID), SlicePath(path, 2)) : null;
								let grandParentRatingType = grandParent ? GetMainRatingType(grandParent) : "probability";
								let specialCase = grandParentRatingType == "adjustment" && parentNode.type == MapNodeType.OpposingArgument;

								let signStr = thenType_final == MetaThesis_ThenType.StrengthenParent ? "+" : "-";
								percentStr = signStr + (specialCase ? average : (average / 2)) + "%";
							}
							/*else if (ratingInfo.type == "support")
								//percentStr = (average >= 100 ? "+" : "-") + average.Distance(100) + "%";
								percentStr = (average < 0 ? "-" : average == 0 ? "" : "+") + average.Distance(0);*/
							else
								percentStr = average + "%";
						}
						return (
							<PanelButton key={ratingInfo.type} {...{onPanelButtonHover, onPanelButtonClick, map, path}}
									panel={ratingInfo.type} text={ratingTypeInfo.displayText} style={E(index == 0 && {marginTop: 0})}>
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
							background: null, boxShadow: null, borderRadius: "0 0 5px 5px",
							":hover": {background: `rgba(${backgroundColor},.5)`},
						}}/>
				</div>
				<div style={{position: "relative", marginTop: 1, padding: 3, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`}}>
					<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${backgroundColor},.7)`}}/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path}} panel="definitions" text="Definitions" style={{marginTop: 0}}/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path}} panel="discussion" text="Discussion"/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path}} panel="social" text="Social"/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path}} panel="tags" text="Tags"/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path}} panel="details" text="Details"/>
					<PanelButton {...{onPanelButtonHover, onPanelButtonClick, map, path}} panel="others" text="Others"/>
					<Button text="..."
						style={{
							margin: "-1px 0 1px 0", height: 17, lineHeight: "12px", padding: 0,
							position: "relative", display: "flex", justifyContent: "space-around", //alignItems: "center",
							background: null, boxShadow: null, borderRadius: "0 0 5px 5px",
							":hover": {background: `rgba(${backgroundColor},.5)`},
						}}/>
				</div>
			</div>
		);
	}
}

type PanelButton_Props = {
	map: Map, path: string, panel: string, text: string, style?,
	onPanelButtonHover: (panel: string)=>void, onPanelButtonClick: (panel: string)=>void,
};
class PanelButton extends BaseComponent<PanelButton_Props, {}> {
	render() {
		let {map, path, panel, text, style, children} = this.props;
		return (
			<Button text={text} style={E({position: "relative", display: "flex", justifyContent: "space-between", marginTop: 5, padding: "3px 7px"}, style)}
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