import {BaseComponent, FindDOM, SimpleShouldUpdate_Overridable} from "react-vextensions";
import NodeUI from "./NodeUI";
import {Vector2i} from "js-vextensions";
import ShallowCompare from "react/lib/shallowCompare";
import {MapNode, MapNodeL2, MapNodeL3} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeType, MapNodeType_Info, GetNodeColor} from "../../../../Store/firebase/nodes/@MapNodeType";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetNodeForm, GetRatingTypesForNode} from "../../../../Store/firebase/nodes/$node";

type Props = {
	node: MapNodeL3, linkSpawnPoint: Vector2i, straightLines?: boolean, nodeChildren: MapNodeL3[],
	//childBoxOffsets: Vector2i[],
	childBoxOffsets: {[key: number]: Vector2i},
	shouldUpdate: boolean
};
@SimpleShouldUpdate_Overridable
export default class NodeConnectorBackground extends BaseComponent<Props, {}> {
	render() {
		var {node, linkSpawnPoint, straightLines, nodeChildren, childBoxOffsets} = this.props;

		return (
			<svg className="clickThroughChain" style={{position: "absolute", overflow: "visible", zIndex: -1}}>
				{childBoxOffsets.Props(true).OrderBy(a=>a.name).map(({name: childIDStr, value: childOffset})=> {
					/*result.push(<line key={"inputLine" + result.length} x1={inputPos.x} y1={inputPos.y}
						x2={inputVal.position.x} y2={inputVal.position.y + 10} style={{stroke: "rgba(0,0,0,.5)", strokeWidth: 2}}/>);*/

					//let child = A.NonNull = childNodes.First(a=>a._id == childIDStr.ToInt());
					// maybe temp; see if causes problems ignoring not-found error
					let child = nodeChildren.FirstOrX(a=>a._id == childIDStr.ToInt());
					if (child == null) return null;

					let backgroundColor = GetNodeColor(/*node.type == MapNodeType.Argument ? node :*/ child, "raw");

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

					if (straightLines) {
						let start = linkSpawnPoint;
						let mid = childOffset.Minus(10, 0);
						let end = childOffset;
						//return <line x1={start.x} y1={start.y} x2={mid.x} y2={mid.y} x3={end.x} y3={end.y}/>;
						//return <polyline stroke="orange" fill="transparent" stroke-width="5"points={`${start.x} ${start.y} ${mid.x} ${mid.y} ${end.x} ${end.y}`}/>;
						return <path key={"connectorLine_" + child._id} style={{stroke: backgroundColor.css(), strokeWidth: 3, fill: "none"}}
							d={`M${start.x},${start.y} L${mid.x},${mid.y} L${end.x},${end.y}`}/>;
					}

					var start = linkSpawnPoint;
					var startControl = start.Plus(30, 0);
					let end = childOffset;
					let endControl = childOffset.Plus(-30, 0);

					let middleControl = start.Plus(end).Times(.5); // average start-and-end to get middle-control
					startControl = startControl.Plus(middleControl).Times(.5); // average with middle-control
					endControl = endControl.Plus(middleControl).Times(.5); // average with middle-control

					return <path key={"connectorLine_" + child._id} style={{stroke: backgroundColor.css(), strokeWidth: 3, fill: "none"}}
						d={`M${start.x},${start.y} C${startControl.x},${startControl.y} ${endControl.x},${endControl.y} ${end.x},${end.y}`}/>;
				})}
			</svg>
		);
	}
}

type Position = [number, number];
export class Squiggle extends BaseComponent
		<{start: Position, startControl_offset: Position, end: Position, endControl_offset: Position, color: Color, usePercents?: boolean, style?}, {}> {
	render() {
		let {start, startControl_offset, end, endControl_offset, color, usePercents, style} = this.props;

		let startPos = new Vector2i(start[0], start[1]);
		let startControl = startPos.Plus(startControl_offset[0], startControl_offset[1]);
		let endPos = new Vector2i(end[0], end[1]);
		let endControl = endPos.Plus(endControl_offset[0], endControl_offset[1]);

		let middleControl = startPos.Plus(endPos).Times(.5); // average start-and-end to get middle-control
		startControl = startControl.Plus(middleControl).Times(.5); // average with middle-control
		endControl = endControl.Plus(middleControl).Times(.5); // average with middle-control

		return (
			<svg viewBox={usePercents ? "0 0 100 100" : null} preserveAspectRatio="none" style={E({position: "absolute", overflow: "visible", zIndex: -1}, style)}>
				<path style={E({stroke: color.css(), strokeWidth: 3, fill: "none"}, usePercents && {vectorEffect: "non-scaling-stroke"})}
					d={`M${startPos.x},${startPos.y} C${startControl.x},${startControl.y} ${endControl.x},${endControl.y} ${endPos.x},${endPos.y}`}/>
			</svg>
		);
	}
}