import {Div, BaseComponent} from "../../Frame/UI/ReactGlobals";
import {styles} from "../../Frame/UI/GlobalStyles";
import {MapNode, MapNodeEnhanced, globalMapID} from "../../Store/firebase/nodes/@MapNode";
import Row from "Frame/ReactComponents/Row";
import NodeUI from "../@Shared/Maps/MapNode/NodeUI";
import {Map} from "../../Store/firebase/maps/@Map";
import { Connect } from "../../Frame/Database/FirebaseConnect";
import { GetMap } from "Store/firebase/maps";
import { GetNodes } from "Store/firebase/nodes";
import {GetNodeEnhanced, GetFinalNodeTypeAtPath, GetNodeDisplayText} from "../../Store/firebase/nodes/$node";
import Column from "../../Frame/ReactComponents/Column";
import ScrollView from "react-vscrollview";
import NodeUI_Menu from "../@Shared/Maps/MapNode/NodeUI_Menu";
import {RatingType_Info, RatingType} from "../../Store/firebase/nodeRatings/@RatingType";
import {GetRatings} from "../../Store/firebase/nodeRatings";
import RatingsPanel from "../@Shared/Maps/MapNode/NodeUI/RatingsPanel";
import DefinitionsPanel from "../@Shared/Maps/MapNode/NodeUI/DefinitionsPanel";
import DiscussionPanel from "../@Shared/Maps/MapNode/NodeUI/DiscussionPanel";
import SocialPanel from "../@Shared/Maps/MapNode/NodeUI/SocialPanel";
import TagsPanel from "../@Shared/Maps/MapNode/NodeUI/TagsPanel";
import OthersPanel from "../@Shared/Maps/MapNode/NodeUI/OthersPanel";
import DetailsPanel from "../@Shared/Maps/MapNode/NodeUI/DetailsPanel";
import {MapNodeType, MapNodeType_Info} from "../../Store/firebase/nodes/@MapNodeType";
import * as Moment from "moment";
import {GetSelectedNode_InList, ACTSelectedNode_InListSet} from "../../Store/main/maps/$map";

type Props = {
} & Partial<{
	map: Map,
	nodes: MapNode[],
	selectedNode: MapNodeEnhanced,
}>;
@Connect(state=> ({
	map: GetMap(globalMapID),
	nodes: GetNodes({limitToFirst: 10}).Take(10), // need to filter results, since other requests may have added extra data
	selectedNode: GetSelectedNode_InList(globalMapID),
}))
export default class GlobalListUI extends BaseComponent<Props, {panelToShow}> {
	render() {
		let {map, nodes, selectedNode} = this.props;

		return (
			<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
				<Column mtb={10} style={{position: "relative", flex: .4, height: "calc(100% - 20px)", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
					<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
						{/*<Div p={7} style={{position: "absolute", left: 0}}>
							<Button text="Add term" onClick={e=> {
								if (userID == null) return ShowSignInPopup();
								ShowAddTermDialog(userID);
							}}/>
						</Div>*/}
						<Div style={{fontSize: 17, fontWeight: 500}}>
							Nodes
						</Div>
					</Row>
					<Row>
						<span style={{flex: 1/3, fontWeight: 500, fontSize: 17}}>Title</span>
						<span style={{flex: 1/3, fontWeight: 500, fontSize: 17}}>Creation date</span>
					</Row>
					<ScrollView contentStyle={{flex: 1, padding: 10}} onClick={e=> {
						if (e.target != e.currentTarget) return;
						store.dispatch(new ACTSelectedNode_InListSet({mapID: map._id, nodeID: null}));
					}}>
						{nodes.map((node, index)=> {
							return <NodeRow key={node._id} map={map} node={node}/>;
						})}
					</ScrollView>
				</Column>
				<ScrollView style={{marginLeft: 10, flex: .6}} contentStyle={{flex: 1, padding: 10}}>
					{selectedNode
						? <NodeColumn map={map} node={selectedNode}/>
						: <div style={{padding: 10}}>No node selected.</div>}
				</ScrollView>
			</Row>
		);
	}
}

class NodeRow extends BaseComponent<{map: Map, node: MapNode}, {}> {
	render() {
		let {map, node} = this.props;
		return (
			<Row sel
					onClick={e=> {
						store.dispatch(new ACTSelectedNode_InListSet({mapID: map._id, nodeID: node._id}));
					}}>
				<span style={{flex: 1/3}}>{GetNodeDisplayText(node)}</span>
				<span style={{flex: 1/3}}>{(Moment as any)(node.createdAt).format("YYYY-MM-DD")}</span>
			</Row>
		);
	}
}

type NodeColumn_Props = {map: Map, node: MapNodeEnhanced} & Partial<{finalNodeType: MapNodeType, panelToShow: string}>;
@Connect((state, {node}: NodeColumn_Props)=> ({
	finalNodeType: GetFinalNodeTypeAtPath(node, node._id+"")
	//panelToShow:	
}))
class NodeColumn extends BaseComponent<NodeColumn_Props, {}> {
	render() {
		let {map, node, finalNodeType, panelToShow} = this.props;

		let path = node._id+"";
		let nodeTypeInfo = MapNodeType_Info.for[finalNodeType];

		let width = "100%";
		let widthOverride = 0;
		let hovered = false;

		return (
			<Row style={{position: "relative", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
				<NodeUI_Menu {...{map, node, path}}/>
				<Column>
					{panelToShow &&
						<div style={{
									position: "absolute", top: "calc(100% + 1px)", width: width, minWidth: (widthOverride|0).KeepAtLeast(550), zIndex: hovered ? 6 : 5,
									padding: 5, background: "rgba(0,0,0,.7)", borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
								}}>
							<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${nodeTypeInfo.backgroundColor},.7)`}}/>
							{RatingType_Info.for[panelToShow] && (()=> {
								let ratings = GetRatings(node._id, panelToShow as RatingType);
								return <RatingsPanel node={node} path={path} ratingType={panelToShow as RatingType} ratings={ratings}/>;
							})()}
							{panelToShow == "definitions" &&
								<DefinitionsPanel {...{node, path, hoverTermID: null, clickTermID: null}}
									/*onHoverTerm={termID=>this.SetState({hoverTermID: termID})} onClickTerm={termID=>this.SetState({clickTermID: termID})}*//>}
							{panelToShow == "discussion" && <DiscussionPanel/>}
							{panelToShow == "social" && <SocialPanel/>}
							{panelToShow == "tags" && <TagsPanel/>}
							{panelToShow == "details" && <DetailsPanel node={node} path={path}/>}
							{panelToShow == "others" && <OthersPanel node={node} path={path}/>}
						</div>}
				</Column>
			</Row>
		);
	}
}