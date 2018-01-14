import {GetNodeParents, GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {GetDataAsync} from "../Database/DatabaseHelpers";
import {MapView, MapNodeView} from "../../Store/main/mapViews/@MapViews";
import {Vector2i, CachedTransform} from "js-vextensions";
import {MapNode} from "../../Store/firebase/nodes/@MapNode";
import {ToInt} from "js-vextensions";
import {GetPathNodes} from "../../Store/main/mapViews";
import {GetNode} from "Store/firebase/nodes";
import {GetAsync, CachedTransform_WithStore} from "Frame/Database/DatabaseHelpers";

export function GetShortestPathFromRootToNode(rootNodeID: number, node: MapNode): string {
	return CachedTransform_WithStore("GetShortestPathFromRootToNode", [rootNodeID, node._id], {}, ()=> {
		GetNode(node._id); // call this so cache system knows to recalculate when node-data changes

		type Head = {id: number, path: number[]};
		let currentLayerHeads: Head[] = (node.parents || {}).VKeys(true).map(id=>({id: parseInt(id), path: [parseInt(id), node._id]}));
		while (currentLayerHeads.length) {
			// first, quickly check if any current-layer-head parents are the root-node (and if so, return right away, as we found a shortest path)
			for (let layerHead of currentLayerHeads) {
				if (layerHead.id == rootNodeID) {
					return layerHead.path.join("/");
				}
			}
	
			// else, find new-layer-heads for next search loop
			let newLayerHeads = [];
			for (let layerHead of currentLayerHeads) {
				let node = GetNode(layerHead.id);
				if (node == null) return null;
				for (let parentID of (node.parents || {}).VKeys(true).map(id=>parseInt(id))) {
					if (layerHead.path.Contains(parentID)) continue; // parent-id is already part of path; ignore, so we don't cause infinite-loop
					newLayerHeads.push({id: parentID, path: [parentID].concat(layerHead.path)})
				}
			}
			currentLayerHeads = newLayerHeads;
		}
		return null;
	});
}

export function CreateMapViewForPath(path: string): MapView {
	let pathNodes = GetPathNodes(path);
	let result = new MapView();
	result.rootNodeViews[pathNodes[0]] = CreateNodeViewForPath(pathNodes.Skip(1));
	return result;
}
export function CreateNodeViewForPath(pathFromSelfToDescendent: string[]): MapNodeView {
	let result = new MapNodeView();
	result.expanded = true;

	if (pathFromSelfToDescendent.length) {
		//Assert(IsNumber(pathFromSelfToDescendent[0]), "pathFromSelfToDescendent must contain only numbers.");
		let nextNodeStr = pathFromSelfToDescendent[0];
		let childNodeView = CreateNodeViewForPath(pathFromSelfToDescendent.Skip(1));
		if (nextNodeStr[0] == "L") {
			result.subnodes[nextNodeStr.replace("L", "")] = childNodeView;
		} else {
			result.children[nextNodeStr] = childNodeView;
		}
	} else {
		result.selected = true;
		result.focused = true;
		result.viewOffset = new Vector2i(200, 0);
	}

	return result;
}