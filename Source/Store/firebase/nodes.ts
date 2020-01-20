import {emptyArray, emptyArray_forLoading, IsNaN, Clone} from "js-vextensions";
import {GetDoc, SlicePath, SplitStringBySlash_Cached, StoreAccessor, GetDocs, WhereFilter} from "mobx-firelink";
import {GetPlayingTimeline, GetPlayingTimelineRevealNodes_UpToAppliedStep, GetPlayingTimelineStepIndex} from "Store/main/maps/mapStates/$mapState";
import {PathSegmentToNodeID} from "Store/main/maps/mapViews/$mapView";
import {GetNodeL2, GetNodeL3, ReversePolarity, AsNodeL1} from "./nodes/$node";
import {globalRootNodeID, MapNode, MapNodeL2, MapNodeL3, Polarity} from "./nodes/@MapNode";
import {MapNodeType, MapNodeType_Info} from "./nodes/@MapNodeType";
import {MeID} from "./users";
import {CanGetBasicPermissions, GetUserAccessLevel, HasAdminPermissions, IsUserCreatorOrMod} from "./users/$user";
import {PermissionGroupSet} from "./users/@User";
import {TitleKey} from "./nodes/@MapNodeRevision";
import {GetNodeRevisionsByTitle} from "./nodeRevisions";
import {GetNodeTags} from "./nodeTags";

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
export const GetNodesByIDs = StoreAccessor(s=>(ids: string[], emptyForLoading = true): MapNode[]=>{
	const nodes = ids.map(id=>GetNode(id));
	if (emptyForLoading && nodes.Any(a=>a == null)) return emptyArray_forLoading;
	return nodes;
});
export const GetNodesByTitle = StoreAccessor(s=>(title: string, titleKey: TitleKey): MapNode[]=>{
	let nodeRevisions = GetNodeRevisionsByTitle(title, titleKey);
	return nodeRevisions.map(a=>GetNode(a.node));
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

export const GetNodeParents = StoreAccessor(s=>(nodeID: string)=>{
	let node = GetNode(nodeID);
	return (node.parents || {}).VKeys().map(id=>GetNode(id));
});
export const GetNodeParentsL2 = StoreAccessor(s=>(nodeID: string)=>{
	return GetNodeParents(nodeID).map(parent=>(parent ? GetNodeL2(parent) : null));
});
export const GetNodeParentsL3 = StoreAccessor(s=>(nodeID: string, path: string)=>{
	return GetNodeParents(nodeID).map(parent=>(parent ? GetNodeL3(SlicePath(path, 1)) : null));
});

export const GetNodeChildren = StoreAccessor(s=>(nodeID: string, includeMirrorChildren = true)=>{
	let node = GetNode(nodeID);
	if (node == null) return emptyArray;
	// special case, for demo map
	if (node.children && node.children[0] instanceof MapNode) {
		return node.children as any as MapNode[];
	}

	let result = (node.children || {}).VKeys().map(id=>GetNode(id));
	if (includeMirrorChildren) {
		let tags = GetNodeTags(nodeID);
		// maybe todo: have disable-direct-children merely stop you from adding new direct children, not hide existing ones
		if (tags.Any(a=>a.mirrorChildrenFromXToY?.nodeY == nodeID && a.mirrorChildrenFromXToY?.disableDirectChildren)) {
			result = [];
		}
		result.push(...GetNodeMirrorChildren(nodeID));
	}
	return result;
});
export const GetNodeMirrorChildren = StoreAccessor(s=>(nodeID: string)=> {
	let tags = GetNodeTags(nodeID);
	let result = [] as MapNode[];
	for (let tag of tags) {
		if (tag.mirrorChildrenFromXToY && tag.mirrorChildrenFromXToY.nodeY == nodeID) {
			let comp = tag.mirrorChildrenFromXToY;
			// for now, don't include node-x's own mirror-children (lazy, temp way to avoid infinite loops)
			let mirrorChildrenL3 = GetNodeChildrenL3(comp.nodeX, undefined, false);
			mirrorChildrenL3 = mirrorChildrenL3.filter(child=> {
				return child && ((child.link.polarity == Polarity.Supporting && comp.mirrorSupporting) || (child.link.polarity == Polarity.Opposing && comp.mirrorOpposing));
			});
			/*if (comp.reversePolarities) {
				mirrorChildren = mirrorChildren.map(child=> {
					let newChild = child;
					if (child.link.polarity) {
						newChild = Clone(child).VSet({_key: child._key}) as MapNodeL3;
						newChild.link.polarity = ReversePolarity(newChild.link.polarity);
					}
					return newChild;
				});
			}*/
			let mirrorChildrenL1 = mirrorChildrenL3.map(childL3=>AsNodeL1(childL3));
			result.push(...mirrorChildrenL1);
		}
	}
	return result;
});

export const GetNodeChildrenL2 = StoreAccessor(s=>(nodeID: string, includeMirrorChildren = true)=>{
	const nodeChildren = GetNodeChildren(nodeID, includeMirrorChildren);
	return nodeChildren.map(child=>(child ? GetNodeL2(child) : null));
});
export const GetNodeChildrenL3 = StoreAccessor(s=>(nodeID: string, path?: string, includeMirrorChildren = true): MapNodeL3[]=>{
	path = path || nodeID;

	const nodeChildrenL2 = GetNodeChildrenL2(nodeID, includeMirrorChildren);
	return nodeChildrenL2.map(child=>(child ? GetNodeL3(`${path}/${child._key}`) : null));
});
export const GetNodeChildrenL3_Advanced = StoreAccessor(s=>(nodeID: string, path: string, mapID: string, includeMirrorChildren = true, applyAccessLevels = false, applyTimeline = false, emptyForLoading = false): MapNodeL3[]=>{
	path = path || nodeID;

	const nodeChildrenL2 = GetNodeChildrenL2(nodeID, includeMirrorChildren);
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
	if (emptyForLoading) {
		nodeChildrenL3 = nodeChildrenL3.Any(a=>a == null) ? emptyArray_forLoading : nodeChildrenL3; // only pass nodeChildren when all are loaded
	}
	return nodeChildrenL3;
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

export const ForDelete_GetError = StoreAccessor(s=>(userID: string, node: MapNodeL2, subcommandInfo?: {asPartOfMapDelete?: boolean, childrenToIgnore?: string[]})=>{
	const baseText = `Cannot delete node #${node._key}, since `;
	if (!IsUserCreatorOrMod(userID, node)) return `${baseText}you are not the owner of this node. (or a mod)`;
	if (GetParentCount(node) > 1) return `${baseText}it has more than one parent. Try unlinking it instead.`;
	if (IsRootNode(node) && !subcommandInfo?.asPartOfMapDelete) return `${baseText}it's the root-node of a map.`;

	const nodeChildren = GetNodeChildrenL2(node._key);
	if (nodeChildren.Any(a=>a == null)) return "[still loading children...]";
	if (nodeChildren.map(a=>a._key).Except(...(subcommandInfo?.childrenToIgnore ?? [])).length) {
		return `Cannot delete this node (#${node._key}) until all its children have been unlinked or deleted.`;
	}
	return null;
});

export const ForCut_GetError = StoreAccessor(s=>(userID: string, node: MapNodeL2)=>{
	const baseText = `Cannot unlink node #${node._key}, since `;
	if (!IsUserCreatorOrMod(userID, node)) return `${baseText}you are not its owner. (or a mod)`;
	//if (!asPartOfCut && (node.parents || {}).VKeys().length <= 1) return `${baseText}doing so would orphan it. Try deleting it instead.`;
	if (IsRootNode(node)) return `${baseText}it's the root-node of a map.`;
	if (IsNodeSubnode(node)) return `${baseText}it's a subnode. Try deleting it instead.`;
	return null;
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