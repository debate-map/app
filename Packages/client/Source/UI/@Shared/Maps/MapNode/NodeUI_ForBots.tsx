import {AsNodeL3, GetNodeChildrenL2, GetNodeDisplayText, GetNodeParentsL2, GetParentNodeL2, GetRatings, GetRatingTypesForNode, Map, MapNodeL2} from "dm_common";
import {GetOpenMapID} from "Store/main";
import {GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {Link} from "web-vcore";
import {Pre, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetInnerComp} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {DefinitionsPanel} from "./NodeUI/Panels/DefinitionsPanel.js";
import {DetailsPanel} from "./NodeUI/Panels/DetailsPanel.js";
import {DiscussionPanel} from "./NodeUI/Panels/DiscussionPanel.js";
import {OthersPanel} from "./NodeUI/Panels/OthersPanel.js";
import {RatingsPanel} from "./NodeUI/Panels/RatingsPanel.js";
import {SocialPanel} from "./NodeUI/Panels/SocialPanel.js";
import {TagsPanel} from "./NodeUI/Panels/TagsPanel.js";
import {NodeUI_Inner} from "./NodeUI_Inner.js";

type Props = {map: Map, node: MapNodeL2};
export class NodeUI_ForBots extends BaseComponentPlus({} as Props, {}) {
	innerUI: NodeUI_Inner;
	render() {
		const {map, node} = this.props;
		const nodeParents = GetNodeParentsL2(node.id);
		const nodeChildren = GetNodeChildrenL2(node.id);
		if (nodeParents.Any(a=>a == null) || nodeChildren.Any(a=>a == null)) return <div/>;

		// just list one of the parents as the "current parent", so code relying on a parent doesn't error
		const path = `${nodeParents.length ? `${nodeParents[0].id}/` : ""}${node.id}`;
		const parent = GetParentNodeL2(path);
		const nodeL3 = AsNodeL3(node, null);
		return (
			<ScrollView ref="scrollView"
				// backgroundDrag={true} backgroundDragMatchFunc={a=>a == GetDOM(this.refs.scrollView.content) || a == this.refs.mapUI}
				scrollVBarStyle={{width: 10}} /* contentStyle={{willChange: "transform"}} */>
				<Row>
					<Pre>Parents: </Pre>{nodeParents.map((parent, index)=>{
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link actionFunc={s=>GetMapView(GetOpenMapID()).bot_currentNodeID = parent.id}>
									{GetNodeDisplayText(parent)} ({parent.id})
								</Link>
							</span>
						);
					})}
				</Row>
				<Row>
					<Pre>Children: </Pre>{nodeChildren.map((child, index)=>{
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link actionFunc={s=>GetMapView(GetOpenMapID()).bot_currentNodeID = child.id}>
									{GetNodeDisplayText(child)} ({child.id})
								</Link>
							</span>
						);
					})}
				</Row>
				<article>
					{/* <Row>ID: {node._id}</Row>
					<Row>Title: {GetNodeDisplayText(node)}</Row> */}
					Main box:
					<NodeUI_Inner
						ref={c=>this.innerUI = GetInnerComp(c)}
						// ref={c => this.innerUI = c ? c['getDecoratedComponentInstance']() : null}
						indexInNodeList={0} map={map} node={nodeL3} path={path} width={null} widthOverride={null}/>
					Panels:
					{GetRatingTypesForNode(nodeL3).map((ratingInfo, index)=>{
						const ratings = GetRatings(node.id, ratingInfo.type);
						return <RatingsPanel key={index} node={nodeL3} path={path} ratingType={ratingInfo.type} ratings={ratings}/>;
					})}
					{/*<PhrasingsPanel show={true} node={node} path={path}/>*/}
					<DefinitionsPanel show={true} map={map} node={node} path={path}/>
					<DiscussionPanel show={true}/>
					<SocialPanel show={true}/>
					<TagsPanel show={true} map={map} node={nodeL3} path={path}/>
					<DetailsPanel show={true} map={map} node={nodeL3} path={path}/>
					<OthersPanel show={true} map={map} node={nodeL3} path={path}/>
				</article>
			</ScrollView>
		);
	}
}