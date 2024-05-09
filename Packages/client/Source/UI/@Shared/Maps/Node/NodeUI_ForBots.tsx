import {AsNodeL3, GetNodeChildrenL2, GetNodeDisplayText, GetNodeParentsL2, GetRatingTypesForNode, Map, NodeL2} from "dm_common";
import {GetOpenMapID} from "Store/main";
import {GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {Link} from "web-vcore";
import {Pre, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetInnerComp} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {DefinitionsPanel} from "./DetailBoxes/Panels/DefinitionsPanel.js";
import {DetailsPanel} from "./DetailBoxes/Panels/DetailsPanel.js";
import {OthersPanel} from "./DetailBoxes/Panels/OthersPanel.js";
import {RatingsPanel} from "./DetailBoxes/Panels/RatingsPanel.js";
import {TagsPanel} from "./DetailBoxes/Panels/TagsPanel.js";
import {NodeBox} from "./NodeBox.js";

type Props = {map: Map, node: NodeL2};
export class NodeUI_ForBots extends BaseComponentPlus({} as Props, {}) {
	innerUI: NodeBox;
	render() {
		const {map, node} = this.props;
		const mapView = GetMapView(GetOpenMapID()!);
		const nodeParents = GetNodeParentsL2(node.id) as NodeL2[];
		const nodeChildren = GetNodeChildrenL2(node.id) as NodeL2[];
		if (mapView == null || nodeParents.Any(a=>a == null) || nodeChildren.Any(a=>a == null)) return <div/>;

		// just list one of the parents as the "current parent", so code relying on a parent doesn't error
		const path = `${nodeParents.length ? `${nodeParents[0].id}/` : ""}${node.id}`;
		//const parentAtPath = GetParentNodeL2(path);
		const nodeL3 = AsNodeL3(node, null);
		return (
			<ScrollView
				// backgroundDrag={true} backgroundDragMatchFunc={a=>a == GetDOM(this.refs.scrollView.contentOuter) || a == this.refs.mapUI}
				scrollVBarStyle={{width: 10}} /*contentOuterStyle={{willChange: "transform"}}*/>
				<Row>
					<Pre>Parents: </Pre>{nodeParents.map((parent, index)=>{
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link actionFunc={s=>mapView.bot_currentNodeID = parent.id}>
									{GetNodeDisplayText(parent, null, map)} ({parent.id})
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
								<Link actionFunc={s=>mapView.bot_currentNodeID = child.id}>
									{GetNodeDisplayText(child, null, map)} ({child.id})
								</Link>
							</span>
						);
					})}
				</Row>
				<article>
					{/* <Row>ID: {node._id}</Row>
					<Row>Title: {GetNodeDisplayText(node)}</Row> */}
					Main box:
					<NodeBox
						ref={c=>this.innerUI = GetInnerComp(c)}
						// ref={c => this.innerUI = c ? c['getDecoratedComponentInstance']() : null}
						indexInNodeList={0} map={map} node={nodeL3} path={path} treePath="0" forLayoutHelper={false} width={null} standardWidthInGroup={null}/>
					Panels:
					{GetRatingTypesForNode(nodeL3).map((ratingInfo, index)=>{
						return <RatingsPanel key={index} node={nodeL3} path={path} ratingType={ratingInfo.type}/>;
					})}
					{/*<PhrasingsPanel show={true} node={node} path={path}/>*/}
					<DefinitionsPanel show={true} map={map} node={node} path={path}/>
					<TagsPanel show={true} map={map} node={nodeL3} path={path}/>
					<DetailsPanel show={true} map={map} node={nodeL3} path={path}/>
					<OthersPanel show={true} map={map} node={nodeL3} path={path}/>
				</article>
			</ScrollView>
		);
	}
}