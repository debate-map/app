import {GetNodeView} from "../../../../Store/main/mapViews";
import {Vector2i} from "../../../../Frame/General/VectorStructs";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {RootState} from "../../../../Store";
import {GetNodeChildren, GetNodeParents} from "../../../../Store/firebase/nodes";
import {GetFillPercentForRatingAverage, GetRatingAverage} from "../../../../Store/firebase/nodeRatings";
import {CachedTransform} from "../../../../Frame/V/VCache";
import Column from "../../../../Frame/ReactComponents/Column";
import Row from "../../../../Frame/ReactComponents/Row";
import {URL} from "../../../../Frame/General/URLs";
import Link from "../../../../Frame/ReactComponents/Link";
import {BaseComponent, BaseProps, Pre} from "../../../../Frame/UI/ReactGlobals";
import {MapNode} from "../../../../Store/firebase/nodes/@MapNode";
import {GetNodeDisplayText} from "../../../../Store/firebase/nodes/$node";

let childrenPlaceholder = [];

function GetCrawlerURLStrForNode(node: MapNode) {
	return GetNodeDisplayText(node).toLowerCase().replace(/[^a-z]/g, "-").replace(/--/g, "-").TrimStart("-").TrimEnd("-") + "." + node._id.toString()
}

type Props = {map: Map, node: MapNode}
	& Partial<{nodeParents: MapNode[], nodeChildren: MapNode[]}>;
@Connect((state: RootState, {node}: Props)=> {
	return {
		nodeParents: GetNodeParents(node),
		nodeChildren: GetNodeChildren(node),
	};
})
export default class NodeUI_ForBots extends BaseComponent<Props, {}> {
	render() {
		let {map, node, nodeParents, nodeChildren} = this.props;
		if (nodeParents.Any(a=>a == null) || nodeChildren.Any(a=>a == null)) return <div/>;
		return (
			<Column>
				<Row>
					<Pre>Parents: </Pre>{nodeParents.map((parent, index)=> {
						let toURL = URL.Current();
						if (parent._id == map.rootNode)
							toURL.pathNodes.RemoveAt(1);
						else
							toURL.pathNodes[1] = GetCrawlerURLStrForNode(parent);
						toURL.queryVars = [];
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link to={toURL.toString(false)}>
									{GetNodeDisplayText(parent)} ({parent._id})
								</Link>
							</span>
						);
					})}
				</Row>
				<Row>
					<Pre>Children: </Pre>{nodeChildren.map((child, index)=> {
						let toURL = URL.Current();
						toURL.pathNodes[1] = GetCrawlerURLStrForNode(child);
						toURL.queryVars = [];
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link to={toURL.toString(false)}>
									{GetNodeDisplayText(child)} ({child._id})
								</Link>
							</span>
						);
					})}
				</Row>
				<article>
					<Row>ID: {node._id}</Row>
					<Row>Title: {GetNodeDisplayText(node)}</Row>
				</article>
			</Column>
		);
	}
}