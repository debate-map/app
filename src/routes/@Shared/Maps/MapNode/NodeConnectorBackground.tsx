import {BaseComponent, FindDOM} from "../../../../Frame/UI/ReactGlobals";
import NodeUI from "./NodeUI";
import {MapNode, MapNodeType} from "../MapNode";
import {Vector2i} from "../../../../Frame/General/VectorStructs";
import {nodeTypeBackgroundColors} from "./NodeUI_Inner";

export default class NodeConnectorBackground extends BaseComponent<{node: MapNode, mainBoxOffset: Vector2i, childNodes: MapNode[], childBoxOffsets: Vector2i[]}, {}> {
	render() {
		var {node, mainBoxOffset, childNodes, childBoxOffsets} = this.props;

		return (
			<svg className="clickThroughChain" style={{position: "absolute", overflow: "visible"}}>
				{childBoxOffsets.map((childOffset, index)=> {
					/*result.push(<line key={"inputLine" + result.length} x1={inputPos.x} y1={inputPos.y}
						x2={inputVal.position.x} y2={inputVal.position.y + 10} style={{stroke: "rgba(0,0,0,.5)", strokeWidth: 2}}/>);*/
					let child = childNodes[index];
					let backgroundColor = node.type == MapNodeType.SupportingArgument || node.type == MapNodeType.OpposingArgument
						? nodeTypeBackgroundColors[node.type]
						: nodeTypeBackgroundColors[child.type];

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

					return <path key={"connectorLine_" + index} style={{stroke: `rgba(${backgroundColor},1)`, strokeWidth: 3, fill: "none"}}
						d={`M${start.x},${start.y} C${startControl.x},${startControl.y} ${endControl.x},${endControl.y} ${end.x},${end.y}`}/>;
				})}
			</svg>
		);
	}
}