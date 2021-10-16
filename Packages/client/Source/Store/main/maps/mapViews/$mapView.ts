import {Vector2, Assert, IsString, GetTreeNodesInObjTree, DeepGet, IsPrimitive, DeepSet, Timer, emptyArray, EA} from "web-vcore/nm/js-vextensions.js";
import {observable} from "web-vcore/nm/mobx.js";
import {O, StoreAction, LogWarning} from "web-vcore";
import {store} from "Store";
import {SplitStringBySlash_Cached, CreateAccessor, Validate, UUID, MobX_AllowStateChanges, WaitTillResolvedThenExecuteSideEffects, RunInAction, BailError} from "web-vcore/nm/mobx-graphlink.js";
import {PathSegmentToNodeID, MapView, MapNodeView, GetNode, MapNodeType, GetDefaultExpansionFieldsForNodeView, ToPathNodes} from "dm_common";

export const GetSelectedNodePathNodes = CreateAccessor((mapViewOrMapID: string | MapView)=>{
	const mapView = IsString(mapViewOrMapID) ? GetMapView(mapViewOrMapID) : mapViewOrMapID;
	if (mapView == null) return [];

	const selectedTreeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "selected" && a.Value);
	if (selectedTreeNode == null) return [];

	const selectedNodeView = selectedTreeNode.ancestorNodes.Last();
	// return selectedNodeView.PathNodes.filter(a=>a != "children").map(ToInt);
	return GetPathFromDataPath(selectedNodeView.PathNodes);
});
export function GetSelectedNodePath(mapViewOrMapID: string | MapView): string {
	return GetSelectedNodePathNodes(mapViewOrMapID).join("/");
}
export function GetSelectedNodeID(mapID: string): string {
	return PathSegmentToNodeID(GetSelectedNodePathNodes(mapID).LastOrX());
}

export function GetPathFromDataPath(dataPathUnderRootNodeViews: string[]): string[] {
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

export const GetFocusedNodePathNodes = CreateAccessor((mapViewOrMapID: string | MapView | n): string[]=>{
	const mapView = IsString(mapViewOrMapID) ? GetMapView(mapViewOrMapID) : mapViewOrMapID;
	if (mapView == null) return [];

	const focusedTreeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "focused" && a.Value);
	if (focusedTreeNode == null) return [];

	const focusedNodeView = focusedTreeNode.ancestorNodes.Last();
	// return focusedNodeView.PathNodes.filter(a=>a != "children").map(ToInt);
	return GetPathFromDataPath(focusedNodeView.PathNodes);
});
export const GetFocusedNodePath = CreateAccessor((mapViewOrMapID: string | MapView | n)=>{
	return GetFocusedNodePathNodes(mapViewOrMapID).join("/").toString(); // toString() needed if only 1 item
});
export const GetFocusedNodeID = CreateAccessor((mapID: string)=>{
	const focusedNodeStr = GetFocusedNodePathNodes(mapID).LastOrX();
	return focusedNodeStr ? PathSegmentToNodeID(focusedNodeStr) : null;
});

export const GetMapView = CreateAccessor(function(mapID: string|n) {
	return this!.store.main.maps.mapViews.get(mapID!); // nn: get() accepts null
});
export function GetNodeViewDataPath_FromRootNodeViews(mapID: string, pathOrPathNodes: string | string[]): string[] {
	const pathNodes = ToPathNodes(pathOrPathNodes);
	// this has better perf than the simpler approaches
	// let childPath = pathNodeIDs.map(childID=>`${childID}/children`).join("/").slice(0, -"/children".length);
	return pathNodes.SelectMany(nodeStr=>["children", nodeStr]).slice(1);
}
/* export function GetNodeViewDataPath_FromStore(mapID: string, pathOrPathNodes: string | string[]): string[] {
	const childPathNodes = GetNodeViewDataPath_FromRootNodeViews(mapID, pathOrPathNodes);
	return ['main', 'mapViews', `${mapID}`, 'rootNodeViews', ...childPathNodes];
} */

export const GetNodeView = CreateAccessor((<{
	(mapID: string|n, pathOrPathNodes: string | string[] | n, createNodeViewsIfMissing?: true): MapNodeView;
	(mapID: string|n, pathOrPathNodes: string | string[] | n, createNodeViewsIfMissing?: false): MapNodeView|n;
}>((mapID: string|n, pathOrPathNodes: string | string[] | n, createNodeViewsIfMissing = true): MapNodeView|n=>{
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
	for (const prop of MapNodeView_SelfOnly_props) {
		nodeView[prop] = DeepGet(s, dataPath.concat([prop]));
	}

	if (nodeView.VKeys().length == 0 && returnEmptyNodeViewIfNull) return emptyNodeView;
	return nodeView.ExcludeKeys('children') as MapNodeView_SelfOnly;*#/
}); */
export const GetViewOffset = CreateAccessor((mapView: MapView|n): Vector2|n=>{
	if (mapView == null) return null;
	const treeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "viewOffset" && a.Value);
	return treeNode ? treeNode.Value : null;
});

// actions
// ==========

export const ACTMapNodeSelect = StoreAction((mapID: string, path: string|n)=>{
	// CreateMapViewIfMissing(mapID);
	const nodes = GetTreeNodesInObjTree(GetMapView(mapID)?.rootNodeViews ?? {}, true);
	const selectedNode = nodes.FirstOrX(a=>a.Value && a.Value.selected)?.Value as MapNodeView;
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

// export const GetNodeView_Advanced = StoreAccessor({ cache_unwrapArgs: [1] }, (s) => (mapID: string, pathOrPathNodes: string | string[], createNodeViewsIfMissing = false): MapNodeView[] => {
// export const GetNodeViewsAlongPath = StoreAccessor({ cache_unwrapArgs: [1] }, (s) => (mapID: string, pathOrPathNodes: string | string[], createNodeViewsIfMissing = false): MapNodeView[] => {
export function GetNodeViewsAlongPath(mapID: string|n, path: string | string[] | n, createNodeViewsIfMissing: true): MapNodeView[];
export function GetNodeViewsAlongPath(mapID: string|n, path: string | string[] | n, createNodeViewsIfMissing?: boolean): (MapNodeView|n)[];
export function GetNodeViewsAlongPath(mapID: string|n, path: string | string[] | n, createNodeViewsIfMissing = false) {
	if (path == null) return emptyArray as (MapNodeView|n)[];
	const rootNodeViews = GetMapView(mapID)?.rootNodeViews ?? {};
	const pathNodes = ToPathNodes(path);
	const nodeViews = [] as (MapNodeView|n)[];
	for (const [i, pathNode] of pathNodes.entries()) {
		if (nodeViews.length && nodeViews.Last() == null) {
			nodeViews.push(null);
			continue;
		}
		let childGroup = nodeViews.length ? nodeViews.Last()!.children : rootNodeViews;
		if (createNodeViewsIfMissing) {
			// temp safeguard against sometimes-occuring bug (which shouldn't ever occur but somehow has/had been)
			if (childGroup == null) {
				LogWarning("MapNodeView.children is null; this shouldn't occur. (devs: find root cause)");
				//Assert(MobX_AllowStateChanges(), "GetNodeViewsAlongPath cannot create-node-views-if-missing, as call-stack is in mobx reaction.");
				//debugger;
				childGroup = nodeViews.Last()!.children = {};
			}

			if (childGroup[pathNode] == null) {
				//Assert(MobX_AllowStateChanges(), "GetNodeViewsAlongPath cannot create-node-views-if-missing, as call-stack is in mobx reaction.");
				childGroup[pathNode] = new MapNodeView(pathNodes.Take(i + 1).join("/"));
			}
		}
		//return childGroup[pathNode];
		nodeViews.push(childGroup[pathNode]);
	}
	return nodeViews;
}
export const GetNodeViewsBelowPath = CreateAccessor((mapID: string|n, pathOrPathNodes: string | string[], includeSelf = false): Map<string, MapNodeView>=>{
	const result = new Map<string, MapNodeView>();
	if (mapID == null) return result;

	const pathNodes = ToPathNodes(pathOrPathNodes);
	const nodeView = GetNodeView(mapID, pathOrPathNodes);
	if (includeSelf) result.set(pathNodes.join("/"), nodeView);

	for (const {key: childID, value: child} of nodeView?.children?.Pairs() ?? []) {
		result.set(pathNodes.concat(childID).join("/"), child);

		const nodeViewsBelowChild = GetNodeViewsBelowPath(mapID, pathNodes.concat(childID));
		for (const [subChildPath, subChild] of nodeViewsBelowChild.entries()) {
			result.set(subChildPath, subChild);
		}
	}
	return result;
});

export function ACTMapNodeExpandedSet(opt: {
	mapID: string|n, path: string,
	expanded?: boolean, expanded_truth?: boolean, expanded_relevance?: boolean,
	expandAncestors?: boolean, resetSubtree?: boolean,
}) {
	//CreateMapViewIfMissing(opt.mapID);
	const pathNodes = ToPathNodes(opt.path);
	const nodeViews = GetNodeViewsAlongPath(opt.mapID, pathNodes, true);

	// first, expand/collapse the node-views that we know the final state of immediately
	RunInAction("ACTMapNodeExpandedSet", ()=>{
		if (opt.expandAncestors) {
			nodeViews.slice(0, -1).forEach(a=>a && (a.expanded = true));
		}
		const nodeView = nodeViews.Last();
		const expandKeysPresent = (["expanded", "expanded_truth", "expanded_relevance"] as const).filter(key=>opt[key] != null);
		if (nodeView) nodeView.Extend(opt.IncludeKeys(...expandKeysPresent));
	});

	// then, if "resetting" subtree, traverse descendent node-views and reset their expansion-fields to their defaults
	// (it can take a moment to retrieve the default-expansion-states of all nodes in the node-view subtree, hence the resolve-waiter wrapper)
	if (opt.resetSubtree) {
		WaitTillResolvedThenExecuteSideEffects({onTimeout: "do nothing"}, addEffect=>{
			let defaultExpansionStatesStillLoading = 0;
			const descendantNodeViews = GetNodeViewsBelowPath(opt.mapID, pathNodes);
			for (const [descendantPath, descendantNodeView] of descendantNodeViews.entries()) {
				//descendantNodeView.Extend({expanded: false, expanded_truth: true, expanded_relevance: true});

				// catch bail for retriving node's expansion state, so it doesn't stop our other expansion-state retrievals from starting (ie. parallel rather than sequential)
				const defaultExpansionState = GetDefaultExpansionFieldsForNodeView.CatchBail(undefined, descendantPath);
				if (defaultExpansionState === undefined) defaultExpansionStatesStillLoading++;
				addEffect(()=>descendantNodeView.Extend(defaultExpansionState));
			}

			if (defaultExpansionStatesStillLoading) throw new BailError(`Still loading the default-expansion-states for ${defaultExpansionStatesStillLoading} nodes.`);
		});
	}
}

/* export const ACTMapNodePanelOpen = StoreAction((mapID: string, path: string, panel: string)=> {
	GetNodeView(mapID, path).openPanel = panel;
}); */

export const ACTMapViewMerge = StoreAction((mapID: string, toMergeMapView: MapView)=>{
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

	// defocus old focused-node, if a new one's being set
	const oldFocusedNode_treeNode = inStoreEntries.FirstOrX(a=>a.Value && a.Value.focused);
	const newFocusedNode_treeNode = toMergeEntries.FirstOrX(a=>a.Value && a.Value.focused);
	if (oldFocusedNode_treeNode && newFocusedNode_treeNode) {
		oldFocusedNode_treeNode.Value.focused = undefined;
		oldFocusedNode_treeNode.Value.viewOffset = undefined;
	}

	const updatePrimitiveTreeNodes = GetTreeNodesInObjTree(toMergeMapView).filter(a=>IsPrimitive(a.Value) || a.Value == null);
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