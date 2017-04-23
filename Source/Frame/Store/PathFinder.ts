import {GetNodeAsync, GetNodeParents, GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {GetDataAsync} from "../Database/DatabaseHelpers";
import {MapView, MapNodeView} from "../../Store/main/mapViews/@MapViews";
import {Vector2i} from "../General/VectorStructs";
import {MapNode} from "../../Store/firebase/nodes/@MapNode";

export async function GetShortestPathFromRootToNode(rootNodeID: number, node: MapNode): Promise<string> {
	type Head = {id: number, path: string[]};
	let currentLayerHeads: Head[] = node.parents.VKeys(true).map(id=>({id: parseInt(id), path: [id, node._id.toString()]}));
	while (currentLayerHeads.length) {
		// first, quickly check if any current-layer-head parents are the root-node (and if so, return right away, as we found a shortest path)
		for (let layerHead of currentLayerHeads) {
			if (layerHead.id == rootNodeID)
				return layerHead.path.join("/");
		}

		// else, find new-layer-heads for next search loop
		let newLayerHeads = [];
		for (let layerHead of currentLayerHeads) {
			let node = await GetNodeAsync(layerHead.id);
			for (let parentID of node.parents.VKeys(true).map(id=>parseInt(id)))
				newLayerHeads.push({id: parentID, path: [parentID.toString()].concat(layerHead.path)})
		}
		currentLayerHeads = newLayerHeads;
	}
	return null;
}

export function CreateMapViewForPath(path: string): MapView {
	let pathNodes = path.split("/");
	let result = new MapView();
	result.rootNodeViews[pathNodes[0]] = CreateNodeViewForPath(pathNodes.Skip(1));
	return result;
}
export function CreateNodeViewForPath(pathFromSelfToDescendent: string[]): MapNodeView {
	let result = new MapNodeView();
	result.expanded = true;

	if (pathFromSelfToDescendent.length)
		result.children[pathFromSelfToDescendent[0]] = CreateNodeViewForPath(pathFromSelfToDescendent.Skip(1));
	else {
		result.selected = true;
		result.focus = true;
		result.viewOffset = new Vector2i(200, 0);
	}

	return result;
}