import {Map, MapNodeL3, MapNodeType} from "dm_common";
import React from "react";
import {store} from "Store";
import {WaitXThenRun_Deduped} from "web-vcore";
import {BaseComponent, UseCallback} from "web-vcore/nm/react-vextensions.js";
import {NodeUI} from "../../NodeUI.js";
import {ChildLimitBar, NodeChildHolder} from "../NodeChildHolder.js";

export class NodeChildHolder_Child extends BaseComponent<{
	map: Map, node: MapNodeL3, path: string, treePath_child: string,
	child: MapNodeL3, index: number, collection_untrimmed: MapNodeL3[],
	direction: "up" | "down", belowNodeUI?: boolean|n, childLimit: number,
	widthOverride?: number|n,
	parent: NodeChildHolder,
}, {}> {
	//static defaultProps = {direction: "down"};
	render() {
		const {map, node, path, treePath_child, child, index, collection_untrimmed, direction, belowNodeUI, childLimit, widthOverride, parent} = this.props;
		const showAll = node.id == map.rootNode || node.type == MapNodeType.argument;
		const {initialChildLimit} = store.main.maps;
		/*if (pack.node.premiseAddHelper) {
			return <PremiseAddHelper mapID={map._id} parentNode={node} parentPath={path}/>;
		}*/

		const isFarthestChildFromDivider = index == (direction == "down" ? childLimit - 1 : 0);
		//const isFarthestChildFromDivider = index == childLimit - 1;
		const showLimitBar = isFarthestChildFromDivider && !showAll && (collection_untrimmed.length > childLimit || childLimit != initialChildLimit);

		const nodeUI = <NodeUI
			ref={UseCallback(c=>parent.childBoxes[child.id] = c, [child.id, parent.childBoxes])}
			ref_innerUI={UseCallback(c=>WaitXThenRun_Deduped(parent, "UpdateChildBoxOffsets", 0, ()=>parent.UpdateChildBoxOffsets()), [parent])}
			indexInNodeList={index} map={map} node={child}
			path={`${path}/${child.id}`}
			treePath={treePath_child}
			leftMarginForLines={belowNodeUI ? 20 : 0}
			widthOverride={widthOverride}
			onHeightOrPosChange={parent.OnChildHeightOrPosChange}/>;
		const limitBar = <ChildLimitBar {...{
			map, path,
			childrenWidthOverride: widthOverride, direction, childLimit,
			childCount: collection_untrimmed.length,
		}}/>;

		if (showLimitBar) {
			return (
				<React.Fragment key={child.id}>
					{direction == "up" && limitBar}
					{nodeUI}
					{direction == "down" && limitBar}
				</React.Fragment>
			);
		}
		return nodeUI;
	}
}