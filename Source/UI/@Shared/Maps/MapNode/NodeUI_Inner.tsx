import {connect} from "react-redux";
import {BaseComponent, Div} from "../../../../Frame/UI/ReactGlobals";
import MapNodeUI_LeftBox from "./NodeUI_LeftBox";
import VMenu from "react-vmenu";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {DN} from "../../../../Frame/General/Globals";
import {DataSnapshot} from "firebase";
import Button from "../../../../Frame/ReactComponents/Button";
import {CachedTransform} from "../../../../Frame/V/VCache";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import keycode from "keycode";
import NodeUI_Menu from "./NodeUI_Menu";
import V from "../../../../Frame/V/V";
import {RatingsRoot} from "../../../../Store/firebase/nodeRatings/@RatingsRoot";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {MapNode} from "../../../../Store/firebase/nodes/@MapNode";
import {GetPaths_NodeRatingsRoot, GetNodeRatingsRoot, GetMainRatingFillPercent, GetRatings} from "../../../../Store/firebase/nodeRatings";
import {GetUserID} from "../../../../Store/firebase/users";
import {MapNodeType_Info} from "../../../../Store/firebase/nodes/@MapNodeType";
import {RootState} from "../../../../Store/index";
import {RatingType_Info, RatingType} from "../../../../Store/firebase/nodeRatings/@RatingType";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {ACTMapNodeSelect, ACTMapNodeExpandedSet} from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import Column from "../../../../Frame/ReactComponents/Column";
import DefinitionsPanel from "./NodeUI/DefinitionsPanel";
import QuestionsPanel from "./NodeUI/QuestionsPanel";
import TagsPanel from "./NodeUI/TagsPanel";
import OthersPanel from "./NodeUI/OthersPanel";
import HistoryPanel from "./NodeUI/HistoryPanel";
import RatingsPanel from "./NodeUI/RatingsPanel";
import DiscussPanel from "./NodeUI/DiscussPanel";

type Props = {map: Map, node: MapNode, nodeView: MapNodeView, path: string, width: number, widthOverride?: number}
	& Partial<{ratingsRoot: RatingsRoot, mainRatingFillPercent: number}>;
//@FirebaseConnect((props: Props)=>((props["holder"] = props["holder"] || {}), [
/*@FirebaseConnect((props: Props)=>[
	...GetPaths_NodeRatingsRoot(props.node._id),
])*/
@Connect(()=> {
	return (state: RootState, {node, ratingsRoot}: Props)=> ({
		ratingsRoot: GetNodeRatingsRoot(node._id),
		mainRatingFillPercent: GetMainRatingFillPercent(node),
	});
})
export default class NodeUI_Inner extends BaseComponent<Props, {hovered: boolean, openPanel_preview: string}> {
	render() {
		let {map, node, nodeView, path, width, widthOverride, ratingsRoot, mainRatingFillPercent} = this.props;
		let firebase = store.firebase.helpers;
		let {hovered, openPanel_preview} = this.state;
		let nodeTypeInfo = MapNodeType_Info.for[node.type];
		let barSize = 5;
		let pathNodeIDs = path.split("/").Select(a=>parseInt(a));
		//let parentNode = GetParentNode(path);

		let leftPanelShow = (nodeView && nodeView.selected) || hovered;
		let panelToShow = openPanel_preview || (nodeView && nodeView.openPanel);
		let bottomPanelShow = leftPanelShow && panelToShow;
		let expanded = nodeView && nodeView.expanded;

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
				{leftPanelShow && <div style={{position: "absolute", right: "100%", width: 1, top: 0, bottom: 0}}/>}

				<div style={{display: "flex", width: "100%", background: "rgba(0,0,0,.7)", borderRadius: 5, cursor: "pointer"}}>
					<div style={{position: "relative", width: "100%", padding: MapNode.GetPadding(node)}}>
						<div style={{
								position: "absolute", left: 0, top: 0, bottom: 0,
								width: mainRatingFillPercent + "%", background: `rgba(${nodeTypeInfo.backgroundColor},.7)`, borderRadius: "5px 0 0 5px"
							}}/>
						<a style={{position: "relative", fontSize: MapNode.GetFontSize(node), whiteSpace: "initial"}}>
							{MapNode.GetDisplayText(node)}
						</a>
						<NodeUI_Menu node={node} path={path}/>
					</div>
					<Button //text={expanded ? "-" : "+"} size={28}
							style={{
								display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
								width: 18, padding: 0,
								fontSize: expanded ? 23 : 17,
								lineHeight: "1px", // keeps text from making meta-theses too tall
								backgroundColor: `rgba(${nodeTypeInfo.backgroundColor.split(",").map(a=>(parseInt(a) * .8).RoundTo(1)).join(",")},.7)`,
								boxShadow: "none",
								":hover": {backgroundColor: `rgba(${nodeTypeInfo.backgroundColor.split(",").map(a=>(parseInt(a) * .9).RoundTo(1)).join(",")},.7)`},
							}}
							onClick={e=> {
								store.dispatch(new ACTMapNodeExpandedSet({mapID: map._id, path, expanded: !expanded, recursive: expanded && e.altKey}));
								//return false;
								e.nativeEvent.ignore = true; // for some reason, "return false" isn't working
							}}>
						{expanded ? "-" : "+"}
					</Button>
				</div>
				{bottomPanelShow &&
					<div style={{
								position: "absolute", top: "calc(100% + 1px)", width: width, minWidth: (widthOverride|0).KeepAtLeast(550), zIndex: hovered ? 6 : 5,
								padding: 5, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`,
							}}>
						<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${nodeTypeInfo.backgroundColor},.7)`}}/>
						{RatingType_Info.for[panelToShow] && (()=> {
							let ratings = GetRatings(node._id, panelToShow as RatingType);
							return <RatingsPanel node={node} path={path} ratingType={panelToShow as RatingType} ratings={ratings}/>;
						})()}
						{panelToShow == "definitions" && <DefinitionsPanel/>}
						{panelToShow == "questions" && <QuestionsPanel/>}
						{panelToShow == "tags" && <TagsPanel/>}
						{panelToShow == "discuss" && <DiscussPanel/>}
						{panelToShow == "history" && <HistoryPanel/>}
						{panelToShow == "others" && <OthersPanel node={node} path={path} userID={GetUserID()}/>}
					</div>}
			</div>
		);
	}
}