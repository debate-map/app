import {Vector2, Assert, IsString, GetTreeNodesInObjTree, DeepGet, IsPrimitive, DeepSet, Timer, emptyArray, EA} from "js-vextensions";
import {observable} from "mobx";
import {O, StoreAction, LogWarning} from "web-vcore";
import {store} from "Store";
import {SplitStringBySlash_Cached, CreateAccessor, Validate, UUID, MobX_AllowStateChanges, WaitTillResolvedThenExecuteSideEffects, RunInAction, BailError} from "mobx-graphlink";
import {PathSegmentToNodeID, MapView, NodeView, GetNode, NodeType, GetDefaultExpansionFieldsForNodeView, ToPathNodes} from "dm_common";

export let cache_lastSelectedNode_nodePath: string[] = [];
export const GetSelectedNodePathNodes = CreateAccessor((mapViewOrMapID: string | MapView)=>{
	const mapView = IsString(mapViewOrMapID) ? GetMapView(mapViewOrMapID) : mapViewOrMapID;
	if (mapView == null) return [];

	// optimization; if last-selected-node is still selected, return that (faster than doing a tree-search for a node with selected=true)
	// [without this, large perf impact was occuring on maps with many expanded nodes; that said, this approach is probably temp, since it only works when a node is actually selected!]
	const cache_lastSelectedNode_dataPath = ConvertNodePathToDataPath(cache_lastSelectedNode_nodePath);
	const nodeViewAtLastPath = DeepGet(mapView.rootNodeViews, cache_lastSelectedNode_dataPath) as NodeView|n;
	if (nodeViewAtLastPath?.selected) return cache_lastSelectedNode_nodePath;

	const selectedTreeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "selected" && a.Value);
	if (selectedTreeNode == null) return [];

	const selectedNodeView_entry = selectedTreeNode.ancestorNodes.Last();
	// return selectedNodeView.PathNodes.filter(a=>a != "children").map(ToInt);
	const nodePath = ConvertDataPathToNodePath(selectedNodeView_entry.PathNodes);
	cache_lastSelectedNode_nodePath = nodePath;
	return nodePath;
});
export function GetSelectedNodePath(mapViewOrMapID: string | MapView): string {
	return GetSelectedNodePathNodes(mapViewOrMapID).join("/");
}
export function GetSelectedNodeID(mapID: string): string {
	return PathSegmentToNodeID(GetSelectedNodePathNodes(mapID).LastOrX());
}

export function ConvertDataPathToNodePath(dataPathUnderRootNodeViews: string[]): string[] {
	const result = [] as string[];
	for (const [index, prop] of dataPathUnderRootNodeViews.entries()) {
		if (index == 0) { // first one is the root-node-id
			result.push(prop);
		} else if (prop == "children") {
			result.push(dataPathUnderRootNodeViews[index + 1]);
		}
	}
	return result;
}
export function ConvertNodePathToDataPath(pathOrPathNodes: string | string[]): string[] {
	const pathNodes = ToPathNodes(pathOrPathNodes);
	// this has better perf than the simpler approaches
	// let childPath = pathNodeIDs.map(childID=>`${childID}/children`).join("/").slice(0, -"/children".length);
	return pathNodes.SelectMany(nodeStr=>["children", nodeStr]).slice(1);
}
/*export function GetNodeViewDataPath_FromStore(mapID: string, pathOrPathNodes: string | string[]): string[] {
	const childPathNodes = GetNodeViewDataPath_FromRootNodeViews(mapID, pathOrPathNodes);
	return ['main', 'mapViews', `${mapID}`, 'rootNodeViews', ...childPathNodes];
}*/

export class FoundNodeViewInfo {
	nodeView: NodeView;
	pathInMap: string;
}
export function InMapView_FindNodeViewWhere(mapView: MapView, condition: (node: NodeView)=>boolean): FoundNodeViewInfo|undefined {
	for (const [rootID, rootView] of Object.entries(mapView.rootNodeViews)) {
		const foundNodeInfo = FindNodeViewWhere(rootView, condition, rootID);
		if (foundNodeInfo != null) {
			return foundNodeInfo;
		}
	}
}
export function FindNodeViewWhere(nodeView: NodeView, condition: (node: NodeView)=>boolean, pathInMap: string): FoundNodeViewInfo|undefined {
	if (condition(nodeView)) {
		return {nodeView, pathInMap};
	}
	for (const [childID, child] of Object.entries(nodeView.children ?? {})) {
		const result = FindNodeViewWhere(child, condition, `${pathInMap}/${childID}`);
		if (result != null) {
			return result;
		}
	}
}

export const GetAnchorNodeInfo = CreateAccessor((mapViewOrMapID: string | MapView | n): FoundNodeViewInfo|undefined=>{
	const mapView = IsString(mapViewOrMapID) ? GetMapView(mapViewOrMapID) : mapViewOrMapID;
	if (mapView == null) return undefined;

	/*const anchorTreeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "anchor" && a.Value);
	if (anchorTreeNode == null) return [];

	const anchorNodeStr = anchorTreeNode.ancestorNodes.Last();
	// return anchorNodeStr.PathNodes.filter(a=>a != "children").map(ToInt);
	return GetPathFromDataPath(anchorNodeStr.PathNodes);*/

	return InMapView_FindNodeViewWhere(mapView, view=>view.viewAnchor == true);
});
export const GetAnchorNodePath = CreateAccessor((mapViewOrMapID: string | MapView | n)=>{
	return GetAnchorNodeInfo(mapViewOrMapID)?.pathInMap;
});
export const GetAnchorNodeID = CreateAccessor((mapID: string)=>{
	const anchorNodeStr = GetAnchorNodePath(mapID)?.split("/").LastOrX();
	return anchorNodeStr ? PathSegmentToNodeID(anchorNodeStr) : null;
});

export const GetMapView = CreateAccessor({ctx: 1}, function(mapID: string|n) {
	return this.store.main.maps.mapViews.get(mapID!); // nn: get() accepts null
});

export const GetNodeView = CreateAccessor((<{
	(mapID: string, pathOrPathNodes: string | string[], createNodeViewsIfMissing?: true): NodeView;
	(mapID: string|n, pathOrPathNodes: string | string[] | n, createNodeViewsIfMissing?: false): NodeView|n;
}>((mapID: string|n, pathOrPathNodes: string | string[] | n, createNodeViewsIfMissing = true): NodeView|n=>{
	if (mapID == null) return null;
	const nodeViews = GetNodeViewsAlongPath(mapID, pathOrPathNodes, createNodeViewsIfMissing);
	return nodeViews.LastOrX();
})));
/* export const GetNodeView_SelfOnly = StoreAccessor((s) => (mapID: string, path: string, returnEmptyNodeViewIfNull = false) => {
	/* const nodeView = GetNodeView(mapID, path);
	if (nodeView == null && returnEmptyNodeViewIfNull) return emptyNodeView; *#/

// access each prop separately, so that changes to the "children" prop do not trigger this sub-watcher to re-run
/*if (path == null) return null;
	const dataPath = GetNodeViewDataPath_FromStore(mapID, path);
	const nodeView = {};
	for (const prop of NodeView_SelfOnly_props) {
		nodeView[prop] = DeepGet(s, dataPath.concat([prop]));
	}

	if (nodeView.VKeys().length == 0 && returnEmptyNodeViewIfNull) return emptyNodeView;
	return nodeView.ExcludeKeys('children') as NodeView_SelfOnly;*#/
}); */
export const GetViewOffset = CreateAccessor((mapView: MapView|n): Vector2|n=>{
	if (mapView == null) return null;
	const treeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "viewOffset" && a.Value);
	return treeNode ? treeNode.Value : null;
});

// actions
// ==========

export const ACTNodeSelect = StoreAction((mapID: string, path: string|n)=>{
	// CreateMapViewIfMissing(mapID);
	const nodes = GetTreeNodesInObjTree(GetMapView(mapID)?.rootNodeViews ?? {}, true);
	const selectedNode = nodes.FirstOrX(a=>a.Value && a.Value.selected)?.Value as NodeView;
	if (selectedNode) {
		/*delete selectedNode.selected;
		delete selectedNode.openPanel;*/
		// fsr, mobx has errors when deleting (https://github.com/mobxjs/mobx/issues/2375) -- so just set to undefined
		selectedNode.selected = undefined;
		selectedNode.openPanel = undefined;
		selectedNode.leftPanelPinned = undefined;
	}

	if (path != null) {
		// const nodeView = GetNodeView(mapID, path);
		const nodeView = GetNodeViewsAlongPath(mapID, path, true).Last();
		Assert(nodeView, `NodeView does not exist where it should: ${path}`);
		nodeView.selected = true;
	}
});

// export const GetNodeView_Advanced = StoreAccessor({ cache_unwrapArgs: [1] }, (s) => (mapID: string, pathOrPathNodes: string | string[], createNodeViewsIfMissing = false): NodeView[] => {
// export const GetNodeViewsAlongPath = StoreAccessor({ cache_unwrapArgs: [1] }, (s) => (mapID: string, pathOrPathNodes: string | string[], createNodeViewsIfMissing = false): NodeView[] => {
export function GetNodeViewsAlongPath(mapID: string|n, path: string | string[] | n, createNodeViewsIfMissing: true): NodeView[];
export function GetNodeViewsAlongPath(mapID: string|n, path: string | string[] | n, createNodeViewsIfMissing?: boolean): (NodeView|n)[];
export function GetNodeViewsAlongPath(mapID: string|n, path: string | string[] | n, createNodeViewsIfMissing = false) {
	if (path == null) return emptyArray as (NodeView|n)[];
	const rootNodeViews = GetMapView(mapID)?.rootNodeViews ?? {};
	const pathNodes = ToPathNodes(path);
	const nodeViews = [] as (NodeView|n)[];
	for (const [i, pathNode] of pathNodes.entries()) {
		if (nodeViews.length && nodeViews.Last() == null) {
			nodeViews.push(null);
			continue;
		}
		let childGroup = nodeViews.length ? (nodeViews.Last()!.children ?? {}) : rootNodeViews;
		if (createNodeViewsIfMissing) {
			// temp safeguard against sometimes-occuring bug (which shouldn't ever occur but somehow has/had been)
			if (childGroup == null) {
				LogWarning("NodeView.children is null; this shouldn't occur. (devs: find root cause)");
				//Assert(MobX_AllowStateChanges(), "GetNodeViewsAlongPath cannot create-node-views-if-missing, as call-stack is in mobx reaction.");
				//debugger;
				childGroup = nodeViews.Last()!.children = {};
			}

			if (childGroup[pathNode] == null) {
				//Assert(MobX_AllowStateChanges(), "GetNodeViewsAlongPath cannot create-node-views-if-missing, as call-stack is in mobx reaction.");
				childGroup[pathNode] = new NodeView(pathNodes.Take(i + 1).join("/"));
			}
		}
		//return childGroup[pathNode];
		nodeViews.push(childGroup[pathNode]);
	}
	return nodeViews;
}
export const GetNodeViewsBelowPath = CreateAccessor((mapID: string|n, pathOrPathNodes: string | string[], includeSelf = false): Map<string, NodeView>=>{
	const result = new Map<string, NodeView>();
	if (mapID == null) return result;

	const pathNodes = ToPathNodes(pathOrPathNodes);
	const nodeView = GetNodeView(mapID, pathOrPathNodes)!;
	if (includeSelf) result.set(pathNodes.join("/"), nodeView);

	for (const [childID, child] of Object.entries(nodeView?.children ?? {})) {
		const child_pathFromRoot = pathNodes.concat(childID).join("/");
		result.set(child_pathFromRoot, child);

		const nodeViewsBelowChild = GetNodeViewsBelowPath(mapID, pathNodes.concat(childID));
		for (const [subChild_pathFromRoot, subChild] of nodeViewsBelowChild.entries()) {
			result.set(subChild_pathFromRoot, subChild);
		}
	}
	return result;
});

export function ACTNodeExpandedSet(opt: {
	mapID: string|n, path: string,
	expanded?: boolean,
	expandAncestors?: boolean, resetSubtree?: boolean,
}) {
	//CreateMapViewIfMissing(opt.mapID);
	const pathNodes = ToPathNodes(opt.path);
	const nodeViews = GetNodeViewsAlongPath(opt.mapID, pathNodes, true);

	RunInAction("ACTNodeExpandedSet", ()=>{
		// first, expand/collapse the node-views that we know the final state of immediately
		if (opt.expandAncestors) {
			nodeViews.slice(0, -1).forEach(a=>a && (a.expanded = true));
		}
		const nodeView = nodeViews.Last();
		if (nodeView && opt.expanded != null) nodeView.expanded = opt.expanded;

		// then, if "resetting" subtree, traverse descendent node-views and reset their expansion-fields to their defaults
		if (opt.resetSubtree) {
			const descendantNodeViews = GetNodeViewsBelowPath(opt.mapID, pathNodes);
			for (const [descendantPath, descendantNodeView] of descendantNodeViews.entries()) {
				const defaultExpansionState = GetDefaultExpansionFieldsForNodeView(descendantPath);
				descendantNodeView.Extend(defaultExpansionState);
			}
		}
	});

	// then, if "resetting" subtree, traverse descendent node-views and reset their expansion-fields to their defaults
	// (it can take a moment to retrieve the default-expansion-states of all nodes in the node-view subtree, hence the resolve-waiter wrapper)
	/*if (opt.resetSubtree) {
		return WaitTillResolvedThenExecuteSideEffects({onTimeout: "do nothing"}, addEffect=>{
			let defaultExpansionStatesStillLoading = 0;
			const descendantNodeViews = GetNodeViewsBelowPath(opt.mapID, pathNodes);
			for (const [descendantPath, descendantNodeView] of descendantNodeViews.entries()) {
				//descendantNodeView.Extend({expanded: false});

				// catch bail for retriving node's expansion state, so it doesn't stop our other expansion-state retrievals from starting (ie. parallel rather than sequential)
				const defaultExpansionState = GetDefaultExpansionFieldsForNodeView.CatchBail(undefined, descendantPath);
				if (defaultExpansionState === undefined) defaultExpansionStatesStillLoading++;
				addEffect(()=>descendantNodeView.Extend(defaultExpansionState));
			}

			if (defaultExpansionStatesStillLoading) throw new BailError(`Still loading the default-expansion-states for ${defaultExpansionStatesStillLoading} nodes.`);
		});
	}*/
}

/* export const ACTNodePanelOpen = StoreAction((mapID: string, path: string, panel: string)=> {
	GetNodeView(mapID, path).openPanel = panel;
}); */

export const ACTMapViewMerge = StoreAction((mapID: string, toMergeMapView: MapView, mergeNulls = true, mergeUndefineds = true)=>{
	// CreateMapViewIfMissing(opt.mapID);
	if (GetMapView(mapID) == null) {
		store.main.maps.mapViews.set(mapID, toMergeMapView);
		return;
	}
	const inStoreMapView = GetMapView.NN(mapID);
	const inStoreEntries = GetTreeNodesInObjTree(inStoreMapView, true);
	const toMergeEntries = GetTreeNodesInObjTree(toMergeMapView, true);

	// deselect old selected-node, if a new one's being set
	const oldSelectedNode_treeNode = inStoreEntries.FirstOrX(a=>a.Value && a.Value.selected);
	const newSelectedNode_treeNode = toMergeEntries.FirstOrX(a=>a.Value && a.Value.selected);
	if (oldSelectedNode_treeNode && newSelectedNode_treeNode) {
		oldSelectedNode_treeNode.Value.selected = undefined;
		oldSelectedNode_treeNode.Value.openPanel = undefined;
	}

	// defocus old anchor-node, if a new one's being set
	const oldAnchorNode_treeNode = inStoreEntries.FirstOrX(a=>a.Value && a.Value.viewAnchor);
	const newAnchorNode_treeNode = toMergeEntries.FirstOrX(a=>a.Value && a.Value.viewAnchor);
	if (oldAnchorNode_treeNode && newAnchorNode_treeNode) {
		oldAnchorNode_treeNode.Value.viewAnchor = undefined;
		oldAnchorNode_treeNode.Value.viewOffset = undefined;
	}

	const updatePrimitiveTreeNodes = GetTreeNodesInObjTree(toMergeMapView).filter(a=>{
		if (a.Value === null) return mergeNulls;
		if (a.Value === undefined) return mergeUndefineds;

		// don't directly merge child node-views (we merge their individual fields instead)
		/*const valIsNodeView = a.Value instanceof NodeView || a.Value.children != null || a.Value.expanded != null;
		if (valIsNodeView) return false;*/

		if (IsPrimitive(a.Value)) return true;
		// the only non-primitive we'd directly merge is the viewOffset prop
		if (a.prop == "viewOffset" && a.Value != null) return true;

		return false;
	});
	for (const updatedNode of updatePrimitiveTreeNodes) {
		// inStoreMapView = u.updateIn(updatedNode.PathStr_Updeep, updatedNode.Value, inStoreMapView);
		DeepSet(inStoreMapView, updatedNode.PathStr, updatedNode.Value);
	}

	// maybe temp (maybe find another way)
	// const mapUI = FindReact($('.MapUI')[0]) as MapUI;
	const MapUI = require("UI/@Shared/Maps/MapUI").MapUI as typeof import("UI/@Shared/Maps/MapUI").MapUI; // late-import, to not violate "no importing UI files from other files" rule
	const mapUI = MapUI.CurrentMapUI;
	if (mapUI) {
		mapUI.LoadStoredScroll();
	}
});