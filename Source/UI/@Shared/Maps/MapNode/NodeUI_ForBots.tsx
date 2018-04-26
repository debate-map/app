import {GetNodeView, GetFocusedNodeID} from "../../../../Store/main/mapViews";
import {Vector2i} from "js-vextensions";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {RootState} from "../../../../Store";
import {GetNodeChildren, GetNodeParents, GetParentNode, GetNode, GetNodeParentsL2, GetParentNodeL2, GetNodeChildrenL2} from "../../../../Store/firebase/nodes";
import {GetRatings} from "../../../../Store/firebase/nodeRatings";
import {CachedTransform} from "js-vextensions";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {VURL} from "js-vextensions";
import Link from "../../../../Frame/ReactComponents/Link";
import {BaseComponent, BaseProps, GetInnerComp} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {MapNode, MapNodeL2, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {GetNodeDisplayText, GetRatingTypesForNode, AsNodeL3} from "../../../../Store/firebase/nodes/$node";
import {NodeUI_Inner} from "./NodeUI_Inner";
import DefinitionsPanel from "./NodeUI/Panels/DefinitionsPanel";
import SocialPanel from "./NodeUI/Panels/SocialPanel";
import TagsPanel from "./NodeUI/Panels/TagsPanel";
import DetailsPanel from "./NodeUI/Panels/DetailsPanel";
import {OthersPanel} from "./NodeUI/Panels/OthersPanel";
import DiscussionPanel from "./NodeUI/Panels/DiscussionPanel";
import RatingsPanel from "./NodeUI/Panels/RatingsPanel";
import {ScrollView} from "react-vscrollview";
import {ACTSet} from "Store";
import {GetOpenMapID} from "../../../../Store/main";
import {GetNewURL} from "../../../../Frame/URL/URLManager";

type Props = {map: Map, node: MapNodeL2}
	& Partial<{nodeParents: MapNodeL2[], nodeChildren: MapNodeL2[]}>;
@Connect((state: RootState, {node}: Props)=> ({
	nodeParents: GetNodeParentsL2(node),
	nodeChildren: GetNodeChildrenL2(node),
}))
export default class NodeUI_ForBots extends BaseComponent<Props, {}> {
	innerUI: NodeUI_Inner;
	render() {
		let {map, node, nodeParents, nodeChildren} = this.props;
		if (nodeParents.Any(a=>a == null) || nodeChildren.Any(a=>a == null)) return <div/>;

		// just list one of the parents as the "current parent", so code relying on a parent doesn't error
		let path = `${nodeParents.length ? nodeParents[0]._id + "/" : ""}${node._id}`;
		let parent = GetParentNodeL2(path);
		let nodeL3 = AsNodeL3(node);
		return (
			<ScrollView ref="scrollView"
					//backgroundDrag={true} backgroundDragMatchFunc={a=>a == GetDOM(this.refs.scrollView.content) || a == this.refs.mapUI}
					scrollVBarStyle={{width: 10}} /*contentStyle={{willChange: "transform"}}*/>
				<Row>
					<Pre>Parents: </Pre>{nodeParents.map((parent, index)=> {
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link actions={d=>d(new ACTSet(`main/mapViews/${1}/bot_currentNodeID`, parent._id))}>
									{GetNodeDisplayText(parent)} ({parent._id})
								</Link>
							</span>
						);
					})}
				</Row>
				<Row>
					<Pre>Children: </Pre>{nodeChildren.map((child, index)=> {
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link actions={d=>d(new ACTSet(`main/mapViews/${1}/bot_currentNodeID`, child._id))}>
									{GetNodeDisplayText(child)} ({child._id})
								</Link>
							</span>
						);
					})}
				</Row>
				<article>
					{/*<Row>ID: {node._id}</Row>
					<Row>Title: {GetNodeDisplayText(node)}</Row>*/}
					Main box:
					<NodeUI_Inner ref={c=>this.innerUI = GetInnerComp(c)} map={map} node={nodeL3} nodeView={{}} path={path} width={null} widthOverride={null}/>
					Panels:
					{GetRatingTypesForNode(nodeL3).map((ratingInfo, index)=> {
						let ratings = GetRatings(node._id, ratingInfo.type);
						return <RatingsPanel key={index} node={nodeL3} path={path} ratingType={ratingInfo.type} ratings={ratings}/>;
					})}
					<DefinitionsPanel node={node} path={path}/>
					<DiscussionPanel/>
					<SocialPanel/>
					<TagsPanel/>
					<DetailsPanel map={map} node={nodeL3} path={path}/>
					<OthersPanel map={map} node={nodeL3} path={path}/>
				</article>
			</ScrollView>
		);
	}
}