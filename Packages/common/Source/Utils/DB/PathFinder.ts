import {MapNode} from "../../DB/nodes/@MapNode.js";
import {GetNode} from "../../DB/nodes.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {GetNodeChildLinks} from "../../DB/nodeChildLinks.js";

export function SearchUpFromNodeForNodeMatchingX(startNodeID: string, xMatchFunc: (nodeID: string)=>boolean, nodeIDsToIgnore?: string[]): string|n {
	// return CachedTransform_WithStore('GetShortestPathFromRootToNode', [rootNodeID, node.id], {}, () => {
	const startNode = GetNode.BIN(startNodeID); // call this so cache system knows to recalculate when node-data changes

	type Head = {id: string, path: string[]};
	// let currentLayerHeads: Head[] = (startNode.parents || {}).VKeys().map((id) => ({ id, path: [id, startNodeID] }));
	let currentLayerHeads: Head[] = [{id: startNode.id, path: [startNode.id]}];
	while (currentLayerHeads.length) {
		// first, check if any current-layer-head nodes are the root-node (if so, return right away, as we found a shortest path)
		for (const layerHead of currentLayerHeads) {
			if (xMatchFunc(layerHead.id)) {
				return layerHead.path.join("/");
			}
		}

		// else, find new-layer-heads for next search loop
		const newLayerHeads = [] as {id: string, path: string[]}[];
		for (const layerHead of currentLayerHeads) {
			const node = GetNode.BIN(layerHead.id);
			const parentLinks = GetNodeChildLinks(undefined, node.id);
			for (const parentID of parentLinks.map(a=>a.parent)) {
				if (layerHead.path.includes(parentID)) continue; // parent-id is already part of path; ignore, so we don't cause infinite-loop
				if (nodeIDsToIgnore?.includes(parentID)) continue;
				newLayerHeads.push({id: parentID, path: [parentID].concat(layerHead.path)});
			}
		}
		currentLayerHeads = newLayerHeads;
	}
	return null;
	// });
}

/* export function CreateMapViewForPath(path: string): MapView {
	const pathNodes = GetPathNodes(path);
	const result = new MapView();
	result.rootNodeViews[pathNodes[0]] = CreateNodeViewForPath(pathNodes.Skip(1));
	return result;
}
export function CreateNodeViewForPath(pathFromSelfToDescendent: string[]): MapNodeView {
	const result = new MapNodeView();
	result.expanded = true;

	if (pathFromSelfToDescendent.length) {
		// Assert(IsNumber(pathFromSelfToDescendent[0]), "pathFromSelfToDescendent must contain only numbers.");
		const nextNodeStr = pathFromSelfToDescendent[0];
		const childNodeView = CreateNodeViewForPath(pathFromSelfToDescendent.Skip(1));
		result.children[nextNodeStr] = childNodeView;
	} else {
		result.selected = true;
		result.focused = true;
		result.viewOffset = new Vector2i(200, 0);
	}

	return result;
} */