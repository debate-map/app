import {Vector2, E, Assert} from "web-vcore/nm/js-vextensions.js";
import {BaseComponent, SimpleShouldUpdate, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {ES, HSLA} from "web-vcore";
import {Fragment} from "react";
import {MapNodeL3} from "dm_common";
import {GetNodeColor} from "Store/db_ext/nodes";

type Props = {
	node: MapNodeL3, path: string, linkSpawnPoint: Vector2, straightLines?: boolean, nodeChildren: MapNodeL3[],
	// childBoxOffsets: Vector2[],
	childBoxOffsets: {[key: number]: Vector2},
	shouldUpdate: boolean
};
// @ExpensiveComponent({ simpleShouldUpdate_options: { useShouldUpdateProp: true } })
@WarnOfTransientObjectProps
@SimpleShouldUpdate({useShouldUpdateProp: true})
export class NodeConnectorBackground extends BaseComponent<Props, {}> {
	render() {
		const {node, path, linkSpawnPoint, straightLines, nodeChildren, childBoxOffsets} = this.props;

		/*const parent = GetParentNodeL3(path);
		//const outerPath = IsPremiseOfSinglePremiseArgument(node, parent) ? SlicePath(path, 1) : path;
		const outerNode = IsPremiseOfSinglePremiseArgument(node, parent) ? parent : node;*/

		return (
			<svg className="clickThroughChain" style={{position: "absolute", top: 0, overflow: "visible", zIndex: -1}}>
				{childBoxOffsets.Pairs().OrderBy(a=>a.key).map(({key: childID, value: childOffset})=>{
					if (childOffset == null) return null;

					/* result.push(<line key={"inputLine" + result.length} x1={inputPos.x} y1={inputPos.y}
						x2={inputVal.position.x} y2={inputVal.position.y + 10} style={{stroke: "rgba(0,0,0,.5)", strokeWidth: 2}}/>); */

					// let child = A.NonNull = childNodes.First(a=>a._id == childIDStr.ToInt());
					// maybe temp; see if causes problems ignoring not-found error
					const child = nodeChildren.FirstOrX(a=>a.id == childID);
					if (child == null) return null;
					Assert(child.link, `Node shown as child in a path must have its "MapNodeL3.link" prop exist.`);

					const backgroundColor = GetNodeColor(/* node.type == MapNodeType.argument ? node : */ child, "raw");

					/* var start = mainBoxOffset;
					var startControl = start.Plus(30, 0);
					let end = childOffset;
					let endControl = childOffset.Plus(-30, 0);
					return <path key={"connectorLine_" + index} style={{stroke: `rgba(${backgroundColor},1)`, strokeWidth: 3, fill: "none"}}
						d={`M${start.x},${start.y} C${startControl.x},${startControl.y} ${endControl.x},${endControl.y} ${end.x},${end.y}`}/>; */
					/* var start = mainBoxOffset;
					var startControl = start.Plus(15, 0);
					let end = childOffset;
					let endControl = childOffset.Plus(-15, 0);
					let middleControl = start.Plus(end).Times(.5);
					return <path key={"connectorLine_" + index} style={{stroke: `rgba(${backgroundColor},1)`, strokeWidth: 3, fill: "none"}}
						d={`M${start.x},${start.y} Q${startControl.x},${startControl.y} ${middleControl.x},${middleControl.y} T${end.x},${end.y}`}/>; */

					if (straightLines) {
						const start = linkSpawnPoint;
						const mid = childOffset.Minus(10, 0);
						const end = childOffset;
						// return <line x1={start.x} y1={start.y} x2={mid.x} y2={mid.y} x3={end.x} y3={end.y}/>;
						// return <polyline stroke="orange" fill="transparent" stroke-width="5"points={`${start.x} ${start.y} ${mid.x} ${mid.y} ${end.x} ${end.y}`}/>;
						return <path key={`connectorLine_${child.id}`} style={E({stroke: backgroundColor.css(), strokeWidth: 3, fill: "none"})}
							d={`M${start.x},${start.y} L${mid.x},${mid.y} L${end.x},${end.y}`}/>;
						/*return <Fragment key={`connectorLine_${child.id}`}>
							{straightLine(child.link._mirrorLink && {strokeDasharray: "10 5"})}
							{child.link._mirrorLink && straightLine({strokeDasharray: "5 10", strokeDashoffset: 5, stroke: HSLA(0, 0, 1, .1)})}
						</Fragment>;*/
					}

					const start = linkSpawnPoint;
					let startControl = start.Plus(30, 0);
					const end = childOffset;
					let endControl = childOffset.Plus(-30, 0);

					const middleControl = start.Plus(end).Times(0.5); // average start-and-end to get middle-control
					startControl = startControl.Plus(middleControl).Times(0.5); // average with middle-control
					endControl = endControl.Plus(middleControl).Times(0.5); // average with middle-control

					const curvedLine = style=>{
						return <path //key={`connectorLine_${child.id}`}
							style={E(
								{stroke: backgroundColor.css(), strokeWidth: 3, fill: "none"},
								style,
							)}
							d={`M${start.x},${start.y} C${startControl.x},${startControl.y} ${endControl.x},${endControl.y} ${end.x},${end.y}`}/>;
					};

					return <Fragment key={`connectorLine_${child.id}`}>
						{curvedLine(child.link._mirrorLink && {strokeDasharray: "10 5"})}
						{child.link._mirrorLink && curvedLine({strokeDasharray: "5 10", strokeDashoffset: 5, stroke: HSLA(0, 0, 1, .1)})}
					</Fragment>;
				})}
			</svg>
		);
	}
}

export class Squiggle extends BaseComponent<{start: Vector2, startControl_offset: Vector2, end: Vector2, endControl_offset: Vector2, color: chroma.Color, usePercents?: boolean, style?}, {}> {
	render() {
		const {start, startControl_offset, end, endControl_offset, color, usePercents, style} = this.props;

		let startControl = start.Plus(startControl_offset);
		let endControl = end.Plus(endControl_offset);

		const middleControl = start.Plus(end).Times(0.5); // average start-and-end to get middle-control
		startControl = startControl.Plus(middleControl).Times(0.5); // average with middle-control
		endControl = endControl.Plus(middleControl).Times(0.5); // average with middle-control

		return (
			<svg viewBox={usePercents ? "0 0 100 100" : null as any} preserveAspectRatio="none" style={E({position: "absolute", overflow: "visible", zIndex: -1}, style)}>
				<path style={ES({stroke: color.css(), strokeWidth: 3, fill: "none"}, usePercents && {vectorEffect: "non-scaling-stroke"})}
					d={`M${start.x},${start.y} C${startControl.x},${startControl.y} ${endControl.x},${endControl.y} ${end.x},${end.y}`}/>
			</svg>
		);
	}
}