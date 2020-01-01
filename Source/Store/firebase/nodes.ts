import {CachedTransform, IsNaN, emptyArray, ToJSON, emptyArray_forLoading} from "js-vextensions";
import {PathSegmentToNodeID} from "Store/main/maps/mapViews/$mapView";
import {GetPlayingTimeline, GetPlayingTimelineStepIndex, GetPlayingTimelineRevealNodes_UpToAppliedStep} from "Store/main/maps/mapStates/$mapState";
import {ObservableMap} from "mobx";
import {SplitStringBySlash_Cached, SlicePath, GetDoc, GetDocs, StoreAccessor} from "mobx-firelink";
import {GetNodeL2, GetNodeL3} from "./nodes/$node";
import {MapNode, MapNodeL2, MapNodeL3, globalRootNodeID} from "./nodes/@MapNode";
import {MapNodeType, MapNodeType_Info} from "./nodes/@MapNodeType";
import {IsUserCreatorOrMod, CanGetBasicPermissions, HasAdminPermissions} from "./userExtras";
import {PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import {GetUserAccessLevel, MeID} from "./users";

export enum HolderType {
	Truth = 10,
	Relevance = 20,
}

/* export type NodeMap = ObservableMap<string, MapNode>;
export const GetNodeMap = StoreAccessor((s) => (): NodeMap => {
	return GetDocs((a) => a.nodes);
}); */
/* export const GetNodes = StoreAccessor((s) => (): MapNode[] => {
	/* const nodeMap = GetNodeMap();
	return CachedTransform('GetNodes', [], nodeMap, () => (nodeMap ? nodeMap.VValues(true) : [])); *#/
	return GetDocs({}, (a) => a.nodes);
});
export const GetNodesL2 = StoreAccessor((s) => (): MapNodeL2[] => {
	const nodes = GetNodes();
	return nodes.map((a) => GetNodeL2(a));
}); */
/* export function GetNodes_Enhanced(): MapNode[] {
	let nodeMap = GetNodeMap();
	return CachedTransform("GetNodes_Enhanced", [], nodeMap, ()=>nodeMap ? nodeMap.VValues(true) : []);
} */
export const GetNodesByIDs = StoreAccessor(s=>(ids: string[], allowStillLoading = false): MapNode[]=>{
	const nodes = ids.map(id=>GetNode(id));
	if (!allowStillLoading && nodes.Any(a=>a == null)) return emptyArray;
	return nodes;
});

export const GetNode = StoreAccessor(s=>(id: string)=>{
	// Assert(id != null && !IsNaN(id), "Node-id cannot be null or NaN.");
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.nodes.get(id));
});
/* export async function GetNodeAsync(id: string) {
	return await GetDataAsync("nodes", id) as MapNode;
} */

export function GetParentCount(node: MapNode) {
	return (node.parents || {}).VKeys().length;
}
export function GetChildCount(node: MapNode) {
	return (node.children || {}).VKeys().length;
}

export function IsRootNode(node: MapNode) {
	if (IsNodeSubnode(node)) return false;
	return node.type == MapNodeType.Category && GetParentCount(node) == 0;
}
export function IsNodeSubnode(node: MapNode) {
	return node.layerPlusAnchorParents != null;
}

export function GetParentPath(childPath: string) {
	const childPathNodes = SplitStringBySlash_Cached(childPath);
	if (childPathNodes.length == 1) return null;
	return childPathNodes.slice(0, -1).join("/");
}
export function GetParentNodeID(path: string) {
	const pathNodes = SplitStringBySlash_Cached(path);
	if (pathNodes.Last()[0] == "*") return null;
	const parentNodeStr = pathNodes.XFromLast(1);
	return parentNodeStr ? PathSegmentToNodeID(parentNodeStr) : null;
}

export const GetParentNode = StoreAccessor(s=>(childPath: string)=>{
	return GetNode(GetParentNodeID(childPath));
});
export const GetParentNodeL2 = StoreAccessor(s=>(childPath: string)=>{
	return GetNodeL2(GetParentNodeID(childPath));
});
export const GetParentNodeL3 = StoreAccessor(s=>(childPath: string)=>{
	return GetNodeL3(GetParentPath(childPath));
});
export const GetNodeID = StoreAccessor(s=>(path: string)=>{
	const ownNodeStr = SplitStringBySlash_Cached(path).LastOrX();
	return ownNodeStr ? PathSegmentToNodeID(ownNodeStr) : null;
});

export const GetNodeParents = StoreAccessor(s=>(node: MapNode)=>{
	const parents = (node.parents || {}).VKeys().map(id=>GetNode(id));
	return parents;
});
/* export async function GetNodeParentsAsync(node: MapNode) {
	return await Promise.all(node.parents.VKeys().map((parentID) => GetDoc_Async(a=>a.nodes.get(parentID))) as MapNode[];
} */
export const GetNodeParentsL2 = StoreAccessor(s=>(node: MapNode)=>{
	const parentsL2 = GetNodeParents(node).map(parent=>(parent ? GetNodeL2(parent) : null));
	return parentsL2;
});
export const GetNodeParentsL3 = StoreAccessor(s=>(node: MapNode, path: string)=>{
	const parentsL3 = GetNodeParents(node).map(parent=>(parent ? GetNodeL3(SlicePath(path, 1)) : null));
	return parentsL3;
});

/* export function GetNodeChildIDs(nodeID: string) {
	let node = GetNode(nodeID);
	// any time the childIDs changes, we know the node object changes as well; so just cache childIDs on node
	if (node["@childIDs"] == null)
		node.VSet("@childIDs", (node.children || {}).VKeys().map(id=>parseInt(id)), {prop: {}});
	return node["@childIDs"];
} */
export const GetNodeChildren = StoreAccessor(s=>(node: MapNode)=>{
	// special case, for demo map
	if (node.children && node.children[0] instanceof MapNode) {
		return node.children as any as MapNode[];
	}

	const children = (node.children || {}).VKeys().map(id=>GetNode(id));
	// return CachedTransform('GetNodeChildren', [node._key], children, () => children);
	return children;
});
/* export async function GetNodeChildrenAsync(node: MapNode) {
	return await Promise.all(node.children.VKeys().map((id) => GetDataAsync('nodes', id))) as MapNode[];
} */

export const GetNodeChildrenL2 = StoreAccessor(s=>(node: MapNode)=>{
	const nodeChildren = GetNodeChildren(node);
	const nodeChildrenL2 = nodeChildren.map(child=>(child ? GetNodeL2(child) : null));
	// return CachedTransform('GetNodeChildrenL2', [], nodeChildrenL2, () => nodeChildrenL2);
	return nodeChildrenL2;
});
export const GetNodeChildrenL3 = StoreAccessor(s=>(node: MapNode, path?: string): MapNodeL3[]=>{
	if (node == null) return emptyArray;
	// return CachedTransform_WithStore('GetNodeChildrenL3', [node._key, path, filterForPath], node.children, () => {
	path = path || `${node._key}`;

	const nodeChildrenL2 = GetNodeChildrenL2(node);
	const nodeChildrenL3 = nodeChildrenL2.map(child=>(child ? GetNodeL3(`${path}/${child._key}`) : null));
	return nodeChildrenL3;
	// return CachedTransform('GetNodeChildrenL3', [node, path, filterForPath], [], () => nodeChildrenL3);
});
export const GetNodeChildrenL3_Advanced = StoreAccessor(s=>(node: MapNode, path: string, mapID: string, applyAccessLevels = false, applyTimeline = false, requireFullyLoaded = false): MapNodeL3[]=>{
	if (node == null) return emptyArray;
	// return CachedTransform_WithStore('GetNodeChildrenL3', [node._key, path, filterForPath], node.children, () => {
	path = path || `${node._key}`;

	const nodeChildrenL2 = GetNodeChildrenL2(node);
	let nodeChildrenL3 = nodeChildrenL2.map(child=>(child ? GetNodeL3(`${path}/${child._key}`) : null));
	if (applyAccessLevels) {
		nodeChildrenL3 = nodeChildrenL3.filter(child=>{
			// if null, keep (so receiver knows there's an entry here, but it's still loading)
			if (child == null) return true;
			// filter out any nodes whose access-level is higher than our own
			if (child.current.accessLevel > GetUserAccessLevel(MeID())) return false;
			// hide nodes that don't have the required premise-count
			// if (!IsNodeVisibleToNonModNonCreators(child, GetNodeChildren(child)) && !IsUserCreatorOrMod(MeID(), child)) return false;
			return true;
		});
	}
	if (applyTimeline) {
		const playingTimeline = GetPlayingTimeline(mapID);
		const playingTimeline_currentStepIndex = GetPlayingTimelineStepIndex(mapID);
		// const playingTimelineShowableNodes = GetPlayingTimelineRevealNodes_All(map._key);
		// const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map._key, true);
		// if users scrolls to step X and expands this node, keep expanded even if user goes back to a previous step
		const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(mapID);
		if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
			// nodeChildrenToShow = nodeChildrenToShow.filter(child => playingTimelineVisibleNodes.Contains(`${path}/${child._key}`));
			// if this node (or a descendent) is marked to be revealed by a currently-applied timeline-step, reveal this node
			nodeChildrenL3 = nodeChildrenL3.filter(child=>child != null && playingTimelineVisibleNodes.Any(a=>a.startsWith(`${path}/${child._key}`)));
		}
	}
	if (requireFullyLoaded) {
		nodeChildrenL3 = nodeChildrenL3.Any(a=>a == null) ? emptyArray_forLoading : nodeChildrenL3; // only pass nodeChildren when all are loaded
	}
	return nodeChildrenL3;
	// return CachedTransform('GetNodeChildrenL3', [node, path, filterForPath], [], () => nodeChildrenL3);
});

export function GetHolderType(childType: MapNodeType, parentType: MapNodeType) {
	if (parentType == MapNodeType.Argument) {
		if (childType == MapNodeType.Argument) return HolderType.Relevance;
	} else if (parentType == MapNodeType.Claim) {
		if (childType == MapNodeType.Argument) return HolderType.Truth;
	}
	return null;
}

export const ForLink_GetError = StoreAccessor(s=>(parentType: MapNodeType, childType: MapNodeType)=>{
	const parentTypeInfo = MapNodeType_Info.for[parentType].childTypes;
	if (!parentTypeInfo.Contains(childType)) return `The child's type (${MapNodeType[childType]}) is not valid for the parent's type (${MapNodeType[parentType]}).`;
});
export const ForNewLink_GetError = StoreAccessor(s=>(parentID: string, newChild: Pick<MapNode, "_key" | "type">, permissions: PermissionGroupSet, newHolderType?: HolderType)=>{
	if (!CanGetBasicPermissions(permissions)) return "You're not signed in, or lack basic permissions.";
	const parent = GetNode(parentID);
	if (parent == null) return "Parent data not found.";
	// const parentPathIDs = SplitStringBySlash_Cached(parentPath).map(a => a.ToInt());
	// if (map.name == "Global" && parentPathIDs.length == 1) return false; // if parent is l1(root), don't accept new children
	if (parent._key == globalRootNodeID && !HasAdminPermissions(permissions)) return "Only admins can add children to the global-root.";
	// if in global map, parent is l2, and user is not a mod (and not node creator), don't accept new children
	// if (parentPathIDs[0] == globalRootNodeID && parentPathIDs.length == 2 && !HasModPermissions(permissions) && parent.creator != MeID()) return false;
	if (parent._key == newChild._key) return "Cannot link node as its own child.";

	const isAlreadyChild = (parent.children || {}).VKeys().Contains(`${newChild._key}`);
	// if new-holder-type is not specified, consider "any" and so don't check
	if (newHolderType !== undefined) {
		const currentHolderType = GetHolderType(newChild.type, parent.type);
		if (isAlreadyChild && currentHolderType == newHolderType) return false; // if already a child of this parent, reject (unless it's a claim, in which case allow, as can be)
	}
	return ForLink_GetError(parent.type, newChild.type);
});

export const ForUnlink_GetError = StoreAccessor(s=>(userID: string, node: MapNodeL2, asPartOfCut = false)=>{
	const baseText = `Cannot unlink node #${node._key}, since `;
	if (!IsUserCreatorOrMod(userID, node)) return `${baseText}you are not its owner. (or a mod)`;
	if (!asPartOfCut && (node.parents || {}).VKeys().length <= 1) return `${baseText}doing so would orphan it. Try deleting it instead.`;
	if (IsRootNode(node)) return `${baseText}it's the root-node of a map.`;
	if (IsNodeSubnode(node)) return `${baseText}it's a subnode. Try deleting it instead.`;
	return null;
});
export const ForDelete_GetError = StoreAccessor(s=>(userID: string, node: MapNodeL2, subcommandInfo?: {asPartOfMapDelete?: boolean, childrenToIgnore?: string[]})=>{
	const baseText = `Cannot delete node #${node._key}, since `;
	if (!IsUserCreatorOrMod(userID, node)) return `${baseText}you are not the owner of this node. (or a mod)`;
	if (GetParentCount(node) > 1) return `${baseText}it has more than one parent. Try unlinking it instead.`;
	if (IsRootNode(node) && !subcommandInfo?.asPartOfMapDelete) return `${baseText}it's the root-node of a map.`;

	const nodeChildren = GetNodeChildrenL2(node);
	if (nodeChildren.Any(a=>a == null)) return "[still loading children...]";
	if (nodeChildren.map(a=>a._key).Except(...(subcommandInfo?.childrenToIgnore ?? [])).length) {
		return `Cannot delete this node (#${node._key}) until all its children have been unlinked or deleted.`;
	}
	return null;
});

export const ForCut_GetError = StoreAccessor(s=>(userID: string, node: MapNodeL2)=>{
	return ForUnlink_GetError(userID, node, true);
});

export const ForCopy_GetError = StoreAccessor(s=>(userID: string, node: MapNode)=>{
	if (!CanGetBasicPermissions(userID)) return "You're not signed in, or lack basic permissions.";
	if (IsRootNode(node)) return "Cannot copy the root-node of a map.";
	if (IsNodeSubnode(node)) return "Cannot copy a subnode.";
	return null;
});

/* export function GetUnlinkErrorMessage(parent: MapNode, child: MapNode) {
	//let childNodes = node.children.Select(a=>nodes[a]);
	let parentNodes = nodes.filter(a=>a.children && a.children[node._id]);
	if (parentNodes.length <= 1)
} */