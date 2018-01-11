import {BaseComponent, FindDOM, SimpleShouldUpdate_Overridable} from "react-vextensions";
import NodeUI from "./NodeUI";
import {Vector2i} from "js-vextensions";
import ShallowCompare from "react/lib/shallowCompare";
import {MapNode, MapNodeL2, MapNodeL3} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeType, MapNodeType_Info, GetNodeBackgroundColor} from "../../../../Store/firebase/nodes/@MapNodeType";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetNodeForm, GetRatingTypesForNode} from "../../../../Store/firebase/nodes/$node";
import {GetFillPercentForRatingAverage, GetRatingAverage} from "../../../../Store/firebase/nodeRatings";

type Props = {
	node: MapNodeL3, mainBoxOffset: Vector2i, childNodes: MapNodeL2[],
	//childBoxOffsets: Vector2i[],
	childBoxOffsets: {[key: number]: Vector2i},
	shouldUpdate: boolean
};
	//& Partial<{nodeChildren_finalNodeTypes: MapNodeType[]}>;
@SimpleShouldUpdate_Overridable
/*@Connect((state, {path, childNodes}: Props)=> ({
	node_finalType: GetFinalNodeTypeAtPath(child, path + "/" + child._id),
	nodeChildren_fillPercents: childNodes.map(child=> {
		return GetFinalNodeTypeAtPath(child, path + "/" + child._id);
	})
}))*/
export default class NodeConnectorBackground extends BaseComponent<Props, {}> {
	render() {
		var {node, mainBoxOffset, childNodes, childBoxOffsets} = this.props;

		return (
			<svg className="clickThroughChain" style={{position: "absolute", overflow: "visible", zIndex: -1}}>
				{childBoxOffsets.Props(true).OrderBy(a=>a.name).map(({name: childIDStr, value: childOffset})=> {
					/*result.push(<line key={"inputLine" + result.length} x1={inputPos.x} y1={inputPos.y}
						x2={inputVal.position.x} y2={inputVal.position.y + 10} style={{stroke: "rgba(0,0,0,.5)", strokeWidth: 2}}/>);*/

					//let child = A.NonNull = childNodes.First(a=>a._id == childIDStr.ToInt());
					// maybe temp; see if causes problems ignoring not-found error
					let child = childNodes.FirstOrX(a=>a._id == childIDStr.ToInt());
					if (child == null) return null;

					let backgroundColor = GetNodeBackgroundColor(node);

					/*var start = mainBoxOffset;
					var startControl = start.Plus(30, 0);
					let end = childOffset;
					let endControl = childOffset.Plus(-30, 0);
					return <path key={"connectorLine_" + index} style={{stroke: `rgba(${backgroundColor},1)`, strokeWidth: 3, fill: "none"}}
						d={`M${start.x},${start.y} C${startControl.x},${startControl.y} ${endControl.x},${endControl.y} ${end.x},${end.y}`}/>;*/
					/*var start = mainBoxOffset;
					var startControl = start.Plus(15, 0);
					let end = childOffset;
					let endControl = childOffset.Plus(-15, 0);
					let middleControl = start.Plus(end).Times(.5);
					return <path key={"connectorLine_" + index} style={{stroke: `rgba(${backgroundColor},1)`, strokeWidth: 3, fill: "none"}}
						d={`M${start.x},${start.y} Q${startControl.x},${startControl.y} ${middleControl.x},${middleControl.y} T${end.x},${end.y}`}/>;*/
					var start = mainBoxOffset;
					var startControl = start.Plus(30, 0);
					let end = childOffset;
					let endControl = childOffset.Plus(-30, 0);

					let middleControl = start.Plus(end).Times(.5); // average start-and-end to get middle-control
					startControl = startControl.Plus(middleControl).Times(.5); // average with middle-control
					endControl = endControl.Plus(middleControl).Times(.5); // average with middle-control

					return <path key={"connectorLine_" + child._id} style={{stroke: `rgba(${backgroundColor},1)`, strokeWidth: 3, fill: "none"}}
						d={`M${start.x},${start.y} C${startControl.x},${startControl.y} ${endControl.x},${endControl.y} ${end.x},${end.y}`}/>;
				})}
			</svg>
		);
	}
}