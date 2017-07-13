import {Div, BaseComponent, FindDOM_, GetInnerComp, Pre} from "../../../Frame/UI/ReactGlobals";
import {styles} from "../../../Frame/UI/GlobalStyles";
import {MapNode, MapNodeEnhanced, globalMapID} from "../../../Store/firebase/nodes/@MapNode";
import Row from "Frame/ReactComponents/Row";
import NodeUI from "../../@Shared/Maps/MapNode/NodeUI";
import {Map} from "../../../Store/firebase/maps/@Map";
import { Connect } from "../../../Frame/Database/FirebaseConnect";
import { GetMap } from "Store/firebase/maps";
import { GetNodes } from "Store/firebase/nodes";
import {GetNodeEnhanced, GetFinalNodeTypeAtPath, GetNodeDisplayText} from "../../../Store/firebase/nodes/$node";
import Column from "../../../Frame/ReactComponents/Column";
import ScrollView from "react-vscrollview";
import NodeUI_Menu from "../../@Shared/Maps/MapNode/NodeUI_Menu";
import {RatingType_Info, RatingType} from "../../../Store/firebase/nodeRatings/@RatingType";
import {GetRatings, GetNodeRatingsRoot} from "../../../Store/firebase/nodeRatings";
import RatingsPanel from "../../@Shared/Maps/MapNode/NodeUI/RatingsPanel";
import DefinitionsPanel from "../../@Shared/Maps/MapNode/NodeUI/DefinitionsPanel";
import DiscussionPanel from "../../@Shared/Maps/MapNode/NodeUI/DiscussionPanel";
import SocialPanel from "../../@Shared/Maps/MapNode/NodeUI/SocialPanel";
import TagsPanel from "../../@Shared/Maps/MapNode/NodeUI/TagsPanel";
import OthersPanel from "../../@Shared/Maps/MapNode/NodeUI/OthersPanel";
import DetailsPanel from "../../@Shared/Maps/MapNode/NodeUI/DetailsPanel";
import {MapNodeType, MapNodeType_Info} from "../../../Store/firebase/nodes/@MapNodeType";
import Moment from "moment";
import { GetSelectedNode_InList, ACTSelectedNode_InListSet, GetMap_List_SelectedNode_OpenPanel, ACTMap_List_SelectedNode_OpenPanelSet, ACTMapNodeListSortBySet, ACTMapNodeListFilterSet } from "../../../Store/main/maps/$map";
import {GetUser, User} from "../../../Store/firebase/users";
import {MapNodeView} from "../../../Store/main/mapViews/@MapViews";
import {RatingsRoot} from "../../../Store/firebase/nodeRatings/@RatingsRoot";
import MapNodeUI_LeftBox from "./MapNode/NodeUI_LeftBox";
import ResizeSensor from "react-resize-sensor";
import {GetEntries} from "../../../Frame/General/Enums";
import Select from "../../../Frame/ReactComponents/Select";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import InfoButton from "../../../Frame/ReactComponents/InfoButton";
import { EnumNameToDisplayName } from "Frame/V/V";

export enum SortType {
	CreatorID,
	CreationDate,
	//UpdateDate,
	//ViewerCount,
}

type Props = {
	map: Map,
} & Partial<{
	nodes: MapNode[],
	sortBy: SortType,
	filter: string,
	selectedNode: MapNodeEnhanced,
}>;
@Connect((state, {map}: Props)=> {
	let selectedNode = GetSelectedNode_InList(map._id);
	return {
		//nodes: GetNodes({limitToFirst: 10}).Take(10), // need to filter results, since other requests may have added extra data
		nodes: GetNodes(),
		sortBy: State("main", "maps", map._id, "list_sortBy"),
		filter: State("main", "maps", map._id, "list_filter"),
		selectedNode: selectedNode ? GetNodeEnhanced(selectedNode, selectedNode._id+"") : null,
	};
})
export default class ListUI extends BaseComponent<Props, {panelToShow}> {
	render() {
		let {map, nodes, sortBy, filter, selectedNode} = this.props;

		nodes = nodes.OrderBy(node=> {
			if (sortBy == SortType.CreatorID) return node.creator;
			if (sortBy == SortType.CreationDate) return node.createdAt;
			//if (sortBy == SortType.UpdateDate) return node.;
			//if (sortBy == SortType.ViewerCount) return node.;
			Assert(false);
		});

		if (filter.length) {
			let regExp;
			if (filter.startsWith("/") && filter.endsWith("/")) {
				try {
					regExp = new RegExp(filter.slice(1, -1), "i");
				} catch (ex) {}
			};
			nodes = nodes.filter(node=> {
				let titles = node.titles ? node.titles.VValues(true) : [];
				if (regExp) {
					return titles.find(a=>a.match(regExp) != null);
				}
				return titles.find(a=>a.toLowerCase().includes(filter.toLowerCase()));
			});
		}

		return (
			<Row style={{height: "100%", alignItems: "flex-start"}}>
				<Column ml={10} mt={10} mb={10} style={{position: "relative", flex: .5, height: "calc(100% - 20px)", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
					<Row style={{height: 40, padding: 10, background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
						<Pre>Sort by: </Pre>
						<Select options={GetEntries(SortType, name=>EnumNameToDisplayName(name))}
							value={sortBy} onChange={val=>store.dispatch(new ACTMapNodeListSortBySet({mapID: map._id, sortBy: val}))}/>
						<Div mlr="auto"/>
						<Pre>Filter:</Pre>
						<InfoButton text="Hides nodes without the given text. Regular expressions can be used, ex: /there are [0-9]+ dimensions/"/>
						<TextInput ml={2} value={filter} onChange={val=>store.dispatch(new ACTMapNodeListFilterSet({mapID: map._id, filter: val}))}/>
					</Row>
					<Row style={{height: 40, padding: 10, background: "rgba(0,0,0,.7)"}}>
						<span style={{flex: .65, fontWeight: 500, fontSize: 17}}>Title</span>
						<span style={{flex: .2, fontWeight: 500, fontSize: 17}}>Creator</span>
						<span style={{flex: .15, fontWeight: 500, fontSize: 17}}>Creation date</span>
					</Row>
					<ScrollView contentStyle={{flex: 1, padding: 10}} onClick={e=> {
						if (e.target != e.currentTarget) return;
						store.dispatch(new ACTSelectedNode_InListSet({mapID: map._id, nodeID: null}));
					}}
					onContextMenu={e=> {
						if (e.nativeEvent["passThrough"]) return true;
						e.preventDefault();
					}}>
						{nodes.map((node, index)=> {
							return <NodeRow key={node._id} map={map} node={node} first={index == 0}/>;
						})}
					</ScrollView>
				</Column>
				<ScrollView style={{padding: 10, flex: .5}} contentStyle={{flex: 1, filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"}}>
					{selectedNode
						? <NodeColumn map={map} node={selectedNode}/>
						: <div style={{padding: 10, textAlign: "center"}}>No node selected.</div>}
				</ScrollView>
			</Row>
		);
	}
}

type NodeRow_Props = {map: Map, node: MapNode, first: boolean} & Partial<{creator: User, selected: boolean}>;
@Connect((state, {map, node}: NodeRow_Props)=> ({
	creator: GetUser(node.creator),
	selected: GetSelectedNode_InList(map._id) == node,
}))
class NodeRow extends BaseComponent<NodeRow_Props, {}> {
	render() {
		let {map, node, first, creator, selected} = this.props;

		let nodeEnhanced = {...node, finalType: node.type} as MapNodeEnhanced;

		return (
			<Row mt={first ? 0 : 5} className="cursorSet"
					style={E(
						{padding: 5, background: "rgba(100,100,100,.5)", borderRadius: 5, cursor: "pointer"},
						selected && {background: "rgba(100,100,100,.7)"},
					)}
					onClick={e=> {
						store.dispatch(new ACTSelectedNode_InListSet({mapID: map._id, nodeID: node._id}));
					}}>
				<span style={{flex: .65}}>{GetNodeDisplayText(node)}</span>
				<span style={{flex: .2}}>{creator ? creator.displayName : "..."}</span>
				<span style={{flex: .15}}>{(Moment as any)(node.createdAt).format("YYYY-MM-DD")}</span>
				{/*<NodeUI_Menu_Helper {...{map, node}}/>*/}
				<NodeUI_Menu {...{map, node: nodeEnhanced, path: ""+node._id, inList: true}}/>
			</Row>
		);
	}
}

/*@Connect((state, {map, node}: NodeRow_Props)=> ({
	nodeEnhanced: GetNodeEnhanced(node._id),
}))
class NodeUI_Menu_Helper extends BaseComponent<{map: Map, node: MapNode, nodeEnhanced: MapNodeEnhanced}, {}> {
	render() {
		let {map, node} = this.props;
		return (
			<NodeUI_Menu_Helper {...{map, node}}/>
		);
	}
}*/

type NodeColumn_Props = {map: Map, node: MapNodeEnhanced} & Partial<{finalNodeType: MapNodeType, ratingsRoot: RatingsRoot, openPanel: string}>;
@Connect((state, {map, node}: NodeColumn_Props)=> ({
	finalNodeType: GetFinalNodeTypeAtPath(node, node._id+""),
	ratingsRoot: GetNodeRatingsRoot(node._id),
	openPanel: GetMap_List_SelectedNode_OpenPanel(map._id),
}))
class NodeColumn extends BaseComponent<NodeColumn_Props, {width: number, hoverPanel: string}> {
	render() {
		let {map, node, finalNodeType, ratingsRoot, openPanel} = this.props;
		let {width, hoverPanel} = this.state;

		let path = node._id+"";
		if (node.metaThesis) { // if meta-thesis, we only have one parent, so might as well fetch it, for accurate polarity and such
			path = node.parents.VKeys(true)[0] + "/" + node._id;
		}
		let nodeTypeInfo = MapNodeType_Info.for[finalNodeType];
		let nodeView = new MapNodeView();

		let panelToShow = hoverPanel || openPanel;

		return (
			<Row style={{alignItems: "flex-start", position: "relative", /*background: "rgba(0,0,0,.5)", borderRadius: 10*/}}>
				{/*<ResizeSensor ref={()=> {
					if (this.refs.ratingsPanel) GetInnerComp(this.refs.ratingsPanel).Update();
				}} onResize={()=> {
					if (this.refs.ratingsPanel) GetInnerComp(this.refs.ratingsPanel).Update();
				}}/>*/}
				<MapNodeUI_LeftBox {...{map, path, node, nodeView, ratingsRoot}}
					onPanelButtonHover={panel=>this.SetState({hoverPanel: panel})}
					onPanelButtonClick={panel=>store.dispatch(new ACTMap_List_SelectedNode_OpenPanelSet({mapID: map._id, panel}))}
					backgroundColor={nodeTypeInfo.backgroundColor} asHover={false} inList={true} style={{marginTop: 25}}/>
				<Column ml={10} style={{flex: 1}}>
					{panelToShow &&
						<div style={{position: "relative", padding: 5, background: "rgba(0,0,0,.7)", borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px"}}>
							<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${nodeTypeInfo.backgroundColor},.7)`}}/>
							{RatingType_Info.for[panelToShow] && (()=> {
								let ratings = GetRatings(node._id, panelToShow as RatingType);
								return <RatingsPanel ref="ratingsPanel" node={node} path={path} ratingType={panelToShow as RatingType} ratings={ratings}/>;
							})()}
							{panelToShow == "definitions" &&
								<DefinitionsPanel {...{node, path, hoverTermID: null}} openTermID={null}
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