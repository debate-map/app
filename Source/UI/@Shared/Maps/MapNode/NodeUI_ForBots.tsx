import {Pre, Row} from "react-vcomponents";
import {BaseComponent, GetInnerComp, BaseComponentPlus} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {Link} from "vwebapp-framework";
import {GetOpenMapID} from "Store/main";
import {GetMapView} from "Store/main/maps/mapViews/$mapView";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {GetRatings} from "../../../../Store/firebase/nodeRatings";
import {GetNodeChildrenL2, GetNodeParentsL2, GetParentNodeL2} from "../../../../Store/firebase/nodes";
import {AsNodeL3, GetNodeDisplayText, GetRatingTypesForNode} from "../../../../Store/firebase/nodes/$node";
import {MapNodeL2} from "../../../../Store/firebase/nodes/@MapNode";
import {DefinitionsPanel} from "./NodeUI/Panels/DefinitionsPanel";
import {DetailsPanel} from "./NodeUI/Panels/DetailsPanel";
import {DiscussionPanel} from "./NodeUI/Panels/DiscussionPanel";
import {OthersPanel} from "./NodeUI/Panels/OthersPanel";
import {RatingsPanel} from "./NodeUI/Panels/RatingsPanel";
import {SocialPanel} from "./NodeUI/Panels/SocialPanel";
import {TagsPanel} from "./NodeUI/Panels/TagsPanel";
import {NodeUI_Inner} from "./NodeUI_Inner";
import {PhrasingsPanel} from "./NodeUI/Panels/PhrasingsPanel";

type Props = {map: Map, node: MapNodeL2};
export class NodeUI_ForBots extends BaseComponentPlus({} as Props, {}) {
	innerUI: NodeUI_Inner;
	render() {
		const {map, node} = this.props;
		const nodeParents = GetNodeParentsL2(node);
		const nodeChildren = GetNodeChildrenL2(node);
		if (nodeParents.Any(a=>a == null) || nodeChildren.Any(a=>a == null)) return <div/>;

		// just list one of the parents as the "current parent", so code relying on a parent doesn't error
		const path = `${nodeParents.length ? `${nodeParents[0]._key}/` : ""}${node._key}`;
		const parent = GetParentNodeL2(path);
		const nodeL3 = AsNodeL3(node);
		return (
			<ScrollView ref="scrollView"
				// backgroundDrag={true} backgroundDragMatchFunc={a=>a == GetDOM(this.refs.scrollView.content) || a == this.refs.mapUI}
				scrollVBarStyle={{width: 10}} /* contentStyle={{willChange: "transform"}} */>
				<Row>
					<Pre>Parents: </Pre>{nodeParents.map((parent, index)=>{
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link actionFunc={s=>GetMapView(GetOpenMapID()).bot_currentNodeID = parent._key}>
									{GetNodeDisplayText(parent)} ({parent._key})
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
								<Link actionFunc={s=>GetMapView(GetOpenMapID()).bot_currentNodeID = child._key}>
									{GetNodeDisplayText(child)} ({child._key})
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
						const ratings = GetRatings(node._key, ratingInfo.type);
						return <RatingsPanel key={index} node={nodeL3} path={path} ratingType={ratingInfo.type} ratings={ratings}/>;
					})}
					<PhrasingsPanel node={node} path={path}/>
					<DefinitionsPanel node={node} path={path}/>
					<DiscussionPanel/>
					<SocialPanel/>
					<TagsPanel map={map} node={nodeL3} path={path}/>
					<DetailsPanel map={map} node={nodeL3} path={path}/>
					<OthersPanel map={map} node={nodeL3} path={path}/>
				</article>
			</ScrollView>
		);
	}
}