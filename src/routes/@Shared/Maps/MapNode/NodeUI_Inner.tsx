import {ACTMapNodeExpandedToggle, ACTMapNodeSelect, MapNodeView} from "../../../../store/Root/Main/MapViews";
import {GetNodeRatingsRoot, GetPaths_NodeRatingsRoot, GetUserID, RatingsRoot} from "../../../../store/Root/Firebase";
import {RootState} from "../../../../store/Root";
import {connect} from "react-redux";
import {Map} from "../Map";
import {BaseComponent} from "../../../../Frame/UI/ReactGlobals";
import MapNodeUI_LeftBox from "./NodeUI_LeftBox";
import VMenu from "react-vmenu";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {DN} from "../../../../Frame/General/Globals";
import {DataSnapshot} from "firebase";
import Button from "../../../../Frame/ReactComponents/Button";
import RatingsUI from "./RatingsUI";
import {CachedTransform} from "../../../../Frame/V/VCache";
import {RatingType_Info, RatingType} from "./RatingType";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import keycode from "keycode";
import NodeUI_Menu from "./NodeUI_Menu";
import {MapNode} from "../MapNode";
import {MapNodeType_Info} from "../MapNodeType";
import {FirebaseConnect} from "../../../../store/Root/Firebase";

type Props = {map: Map, node: MapNode, nodeView: MapNodeView, path: string, width: number, widthOverride?: number} & Partial<{userID: string, ratingsRoot: RatingsRoot}>;
@FirebaseConnect(({node}: Props)=>[
	...GetPaths_NodeRatingsRoot({node}),
])
@(connect(()=> {
	return (state: RootState, {node, ratingsRoot}: Props)=> ({
		userID: GetUserID(),
		ratingsRoot: GetNodeRatingsRoot(state, {node}),
	}) as any;
}) as any)
export default class NodeUI_Inner extends BaseComponent<Props, {hovered: boolean, openPanel_preview: string}> {
	render() {
		let {firebase, map, node, nodeView, path, width, widthOverride, userID, ratingsRoot} = this.props;
		let {hovered, openPanel_preview} = this.state;
		let nodeTypeInfo = MapNodeType_Info.for[node.type];
		let barSize = 5;
		let pathNodeIDs = path.split("/").Select(a=>parseInt(a));

		let mainRatingSet = ratingsRoot && ratingsRoot[nodeTypeInfo.mainRatingTypes[0]];
		let mainRatingAverage = CachedTransform("getMainRatingAverage", {nodeID: node._id, ratingType: nodeTypeInfo.mainRatingTypes[0]}, {ratingSet: mainRatingSet},
			()=>mainRatingSet ? mainRatingSet.Props.Where(a=>a.name != "_id").Select(a=>a.value.value).Average() : 0);

		let leftPanelShow = (nodeView && nodeView.selected) || hovered;
		let panelToShow = openPanel_preview || (nodeView && nodeView.openPanel);
		let bottomPanelShow = leftPanelShow && panelToShow;

		return (
			<div className={`NodeUI_Inner${pathNodeIDs.length == 0 ? " root" : ""}`} style={{
						display: "flex", position: "relative", borderRadius: 5, cursor: "default",
						boxShadow: `rgba(0,0,0,1) 0px 0px 2px`, width, minWidth: widthOverride,
					}}
					onMouseEnter={()=>this.SetState({hovered: true})} onMouseLeave={()=>this.SetState({hovered: false})}
					onClick={e=> {
						if ((e.nativeEvent as any).ignore) return;
						if (nodeView == null || !nodeView.selected)
							store.dispatch(new ACTMapNodeSelect({mapID: map._id, path}));
					}}>
				{leftPanelShow &&
					<MapNodeUI_LeftBox parent={this} map={map} path={path} node={node} nodeView={nodeView} ratingsRoot={ratingsRoot}
						backgroundColor={nodeTypeInfo.backgroundColor} asHover={hovered}/>}
				{/* fixes click-gap */}
				{leftPanelShow &&
					<div style={{
						position: "absolute",
						right: "100%", width: 1, top: 0, bottom: 0,
						//left: -50, width: 100, top: 0, bottom: 0,
					}}/>}

				<div style={{
							display: "flex", width: "100%", //background: `rgba(${backgroundColor},.7)`,
							background: "rgba(0,0,0,.7)", borderRadius: 5, cursor: "pointer",
						}}>
					<div style={{
								position: "relative", width: "100%", //minWidth: minWidth - 20, maxWidth: maxWidth - 20,
								padding: 5, //node.type == MapNodeType.Category || node.type == MapNodeType.Package ? 5 : "3px 5px",
							}}>
						<div style={{
								position: "absolute", left: 0, top: 0, bottom: 0,
								width: mainRatingAverage + "%", background: `rgba(${nodeTypeInfo.backgroundColor},.7)`, borderRadius: "5px 0 0 5px"
							}}/>
						<a style={{position: "relative", fontSize: nodeTypeInfo.fontSize, whiteSpace: "initial"}}>
							{node.title}
						</a>
						<NodeUI_Menu node={node} path={path} userID={userID}/>
					</div>
					<Button //text={nodeView && nodeView.expanded ? "-" : "+"} size={28}
							style={{
								display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
								width: 18, padding: 0,
								//fontSize: 18,
								fontSize: nodeView && nodeView.expanded ? 23 : 17,
								//lineHeight: "28px",
								//backgroundColor: `rgba(${backgroundColor},.5)`,
								backgroundColor: `rgba(${nodeTypeInfo.backgroundColor.split(",").Select(a=>(parseInt(a) * .8).RoundTo(1)).join(",")},.7)`,
								boxShadow: "none",
								":hover": {backgroundColor: `rgba(${nodeTypeInfo.backgroundColor.split(",").Select(a=>(parseInt(a) * .9).RoundTo(1)).join(",")},.7)`},
							}}
							onClick={e=> {
								store.dispatch(new ACTMapNodeExpandedToggle({mapID: map._id, path}));
								//return false;
								e.nativeEvent.ignore = true; // for some reason, "return false" isn't working
							}}>
						{nodeView && nodeView.expanded ? "-" : "+"}
					</Button>
				</div>
				{bottomPanelShow &&
					<div style={{
								position: "absolute", top: "calc(100% + 1px)", width: width, minWidth: (widthOverride|0).KeepAtLeast(550), zIndex: hovered ? 6 : 5,
								padding: 5, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`,
							}}>
						<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${nodeTypeInfo.backgroundColor},.7)`}}/>
						{RatingType_Info.for[panelToShow] &&
							<RatingsUI node={node} path={path} ratingType={panelToShow as RatingType}
								ratings={ratingsRoot && ratingsRoot[panelToShow] ? ratingsRoot[panelToShow].Props.Where(a=>a.name != "_id").Select(a=>a.value) : []}/>}
						{panelToShow == "definitions" &&
							<div style={{position: "relative"}}>
								<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
									Proponents of the thesis can submit and upvote their definitions of the terms. (thus clarifying their meaning)
								</div>
							</div>}
						{panelToShow == "questions" &&
							<div style={{position: "relative"}}>
								<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
									Questions can be asked here concerning clarification of the statement's meaning. (other comments belong in the "Discuss" panel)
								</div>
							</div>}
						{panelToShow == "history" &&
							<div style={{position: "relative"}}>
								<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
									NodeID: {node._id}
								</div>
							</div>}
					</div>}
			</div>
		);
	}
}