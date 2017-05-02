import {BaseComponent, Span} from "../../../../Frame/UI/ReactGlobals";
import MapNodeUI_Inner from "./NodeUI_Inner";
import Button from "../../../../Frame/ReactComponents/Button";
import {E} from "../../../../Frame/General/Globals_Free";
import {connect} from "react-redux";
import {CachedTransform} from "../../../../Frame/V/VCache";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {MapNode} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {RatingsRoot} from "../../../../Store/firebase/nodeRatings/@RatingsRoot";
import {MapNodeType_Info} from "../../../../Store/firebase/nodes/@MapNodeType";
import {RatingType_Info, RatingType} from "../../../../Store/firebase/nodeRatings/@RatingType";
import {GetRatingAverage, GetRatings} from "../../../../Store/firebase/nodeRatings";
import {ACTMapNodePanelOpen} from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {MetaThesis_ThenType} from "../../../../Store/firebase/nodes/@MetaThesisInfo";
import {GetRatingTypesForNode} from "../../../../Store/firebase/nodes/$node";

type Props = {
	parent: MapNodeUI_Inner, map: Map, path: string, node: MapNode, nodeView?: MapNodeView, ratingsRoot: RatingsRoot,
	backgroundColor: string, asHover: boolean
};
export default class MapNodeUI_LeftBox extends BaseComponent<Props, {}> {
	render() {
		let {map, path, node, nodeView, ratingsRoot, backgroundColor, asHover} = this.props;

		let nodeTypeInfo = MapNodeType_Info.for[node.type];

		return (
			<div style={{
				display: "flex", flexDirection: "column", position: "absolute", whiteSpace: "nowrap",
				right: "calc(100% + 1px)", zIndex: asHover ? 6 : 5,
			}}>
				<div style={{position: "relative", padding: 3, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`}}>
					<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${backgroundColor},.7)`}}/>
					{GetRatingTypesForNode(node).map((ratingInfo, index)=> {
						let ratingTypeInfo = RatingType_Info.for[ratingInfo.type];
						//let ratingSet = ratingsRoot && ratingsRoot[ratingType];

						let percentStr = "...";
						let ratings = GetRatings(node._id, ratingInfo.type);
						let average = GetRatingAverage(node._id, ratingInfo.type, null, -1);
						if (average != -1) {
							if (node.metaThesis && (node.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || node.metaThesis.thenType == MetaThesis_ThenType.WeakenParent))
								percentStr = (node.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent ? "+" : "-") + average.Distance(50) + "%";
							/*else if (ratingInfo.type == "support")
								//percentStr = (average >= 100 ? "+" : "-") + average.Distance(100) + "%";
								percentStr = (average < 0 ? "-" : average == 0 ? "" : "+") + average.Distance(0);*/
							else
								percentStr = average + "%";
						}
						return (
							<PanelButton key={ratingInfo.type} parent={this} map={map} path={path}
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
					<PanelButton parent={this} map={map} path={path} panel="definitions" text="Definitions" style={{marginTop: 0}}/>
					<PanelButton parent={this} map={map} path={path} panel="discussion" text="Discussion"/>
					<PanelButton parent={this} map={map} path={path} panel="social" text="Social"/>
					<PanelButton parent={this} map={map} path={path} panel="tags" text="Tags"/>
					<PanelButton parent={this} map={map} path={path} panel="details" text="Details"/>
					<PanelButton parent={this} map={map} path={path} panel="others" text="Others"/>
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

class PanelButton extends BaseComponent<{parent: MapNodeUI_LeftBox, map: Map, path: string, panel: string, text: string, style?}, {}> {
	render() {
		let {map, path, panel, text, style, children} = this.props;
		return (
			<Button text={text} style={E({position: "relative", display: "flex", justifyContent: "space-between", marginTop: 5, padding: "3px 7px"}, style)}
					onClick={()=> {
						//parent.props.parent.SetState({openPanel: panel});
						store.dispatch(new ACTMapNodePanelOpen({mapID: map._id, path, panel}));
					}}
					onMouseEnter={()=> {
						let {parent} = this.props;
						parent.props.parent.SetState({openPanel_preview: panel});
					}}
					onMouseLeave={()=> {
						let {parent} = this.props;
						parent.props.parent.SetState({openPanel_preview: null});
					}}>
				{/*<div style={{position: "absolute", right: -4, width: 4, top: 0, bottom: 0}}/>*/}
				{/* capture mouse events in gap above and below self */}
				<div style={{position: "absolute", left: 0, right: 0, top: -3, bottom: -2}}/>
				{children}
			</Button>
		);
	}
}