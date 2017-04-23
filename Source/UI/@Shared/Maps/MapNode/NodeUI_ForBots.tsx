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
import {
    GetMainRatingTypesForNode,
    GetNodeDisplayText,
    MapNode,
    ThesisForm
} from "../../../../Store/firebase/nodes/@MapNode";
import {BaseComponent, BaseProps, Pre} from "../../../../Frame/UI/ReactGlobals";

let childrenPlaceholder = [];

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
						toURL.pathNodes[1] = parent._id.toString();
						toURL.queryVars = [];
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link to={toURL.toString(false)}>
									{GetNodeDisplayText(parent, ThesisForm.Base) || parent.titles.VValues(true).FirstOrX(a=>!!a)} ({parent._id})
								</Link>
							</span>
						);
					})}
				</Row>
				<Row>
					<Pre>Children: </Pre>{nodeChildren.map((child, index)=> {
						let toURL = URL.Current();
						toURL.pathNodes[1] = child._id.toString();
						toURL.queryVars = [];
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link to={toURL.toString(false)}>
									{GetNodeDisplayText(child, ThesisForm.Base) || child.titles.VValues(true).FirstOrX(a=>!!a)} ({child._id})
								</Link>
							</span>
						);
					})}
				</Row>
				<Row>ID: {node._id}</Row>
				<Row>Title: {GetNodeDisplayText(node, ThesisForm.Base) || node.titles.VValues(true).FirstOrX(a=>!!a)}</Row>
			</Column>
		);
	}
}