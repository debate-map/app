import {HasModPermissions, PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import {IsNaN, IsObjectOf, IsObject, IsNumber} from "js-vextensions";
import {GetData, GetDataAsync, SlicePath} from "../../Frame/Database/DatabaseHelpers";
import {MapNode, globalRootNodeID, MapNodeL2} from "./nodes/@MapNode";
import {CachedTransform} from "js-vextensions";
import {MapNodeType_Info, MapNodeType} from "./nodes/@MapNodeType";
import {IsUserCreatorOrMod} from "./userExtras";
import {GetUserPermissionGroups, GetUserID, GetUserAccessLevel} from "./users";
import {GetNodeL2, GetNodeL3} from "./nodes/$node";
import {Map} from "./maps/@Map";
import {SplitStringBySlash_Cached} from "Frame/Database/StringSplitCache";

export type NodeMap = {[key: string]: MapNode};
export function GetNodeMap(queries?): NodeMap {
	return GetData({queries}, "nodes");
}
export function GetNodes(queries?): MapNode[] {
	let nodeMap = GetNodeMap(queries);
	return CachedTransform("GetNodes", [ToJSON(queries)], nodeMap, ()=>nodeMap ? nodeMap.VValues(true) : []);
}
export function GetNodesL2(queries?): MapNodeL2[] {
	let nodes = GetNodes(queries);
	return CachedTransform("GetNodes", [ToJSON(queries)], nodes, ()=>nodes.map(a=>GetNodeL2(a)));
}
/*export function GetNodes_Enhanced(): MapNode[] {
	let nodeMap = GetNodeMap();
	return CachedTransform("GetNodes_Enhanced", [], nodeMap, ()=>nodeMap ? nodeMap.VValues(true) : []);
}*/

export function GetNode(id: number) {
	//Assert(id != null && !IsNaN(id), "Node-id cannot be null or NaN.");
	if (id == null || IsNaN(id)) return null;
	return GetData("nodes", id) as MapNode;
}
/*export async function GetNodeAsync(id: number) {
	return await GetDataAsync("nodes", id) as MapNode;
}*/

export function GetParentCount(node: MapNode) {
	return (node.parents || {}).VKeys(true).length;
}
export function GetChildCount(node: MapNode) {
	return (node.children || {}).VKeys(true).length;
}

export function IsRootNode(node: MapNode) {
	if (IsNodeSubnode(node)) return false;
	return GetParentCount(node) == 0;
}
export function IsNodeSubnode(node: MapNode) {
	return node.layerPlusAnchorParents != null;
}

export function GetParentNodeID(path: string) {
	let pathNodes = SplitStringBySlash_Cached(path);
	if (pathNodes.Last()[0] == "L") return null;
	let parentNodeStr = pathNodes.XFromLast(1);
	return parentNodeStr ? parentNodeStr.replace("L", "").ToInt() : null;
}
export function GetParentNode(childPath: string) {
	return GetNode(GetParentNodeID(childPath));
}
export function GetParentNodeL2(childPath: string) {
	return GetNodeL2(GetParentNodeID(childPath));
}
export function GetParentNodeL3(childPath: string) {
	return GetNodeL3(GetParentNodeID(childPath), childPath.split("/").slice(0, -1).join("/"));
}
export function GetNodeID(path: string) {
	let ownNodeStr = SplitStringBySlash_Cached(path).LastOrX();
	return ownNodeStr ? ownNodeStr.replace("L", "").ToInt() : null;
}

export function GetNodeParents(node: MapNode) {
	let parents = (node.parents || {}).VKeys(true).map(id=>GetNode(parseInt(id)));
	return CachedTransform("GetNodeParents", [node._id], parents, ()=>parents);
}
export async function GetNodeParentsAsync(node: MapNode) {
	return await Promise.all(node.parents.VKeys(true).map(parentID=>GetDataAsync("nodes", parentID))) as MapNode[];
}
export function GetNodeParentsL2(node: MapNode) {
	let parentsL2 = GetNodeParents(node).map(parent=>parent ? GetNodeL2(parent) : null);
	return CachedTransform("GetNodeParentsL2", [], parentsL2, ()=>parentsL2);
}
export function GetNodeParentsL3(node: MapNode, path: string) {
	let parentsL3 = GetNodeParents(node).map(parent=>parent ? GetNodeL3(parent, SlicePath(path, 1)) : null);
	return CachedTransform("GetNodeParentsL3", [path], parentsL3, ()=>parentsL3);
}

/*export function GetNodeChildIDs(nodeID: number) {
	let node = GetNode(nodeID);
	// any time the childIDs changes, we know the node object changes as well; so just cache childIDs on node
	if (node["@childIDs"] == null)
		node.VSet("@childIDs", (node.children || {}).VKeys(true).map(id=>parseInt(id)), {prop: {}});
	return node["@childIDs"];
}*/
export function GetNodeChildren(node: MapNode) {
	// special case, for demo map
	if (node.children && node.children[0] instanceof MapNode) {
		return node.children as any as MapNode[];
	}

	let children = (node.children || {}).VKeys(true).map(id=>GetNode(parseInt(id)));
	return CachedTransform("GetNodeChildren", [node._id], children, ()=>children);
}
export async function GetNodeChildrenAsync(node: MapNode) {
	return await Promise.all(node.children.VKeys(true).map(id=>GetDataAsync("nodes", id))) as MapNode[];
}

export function GetNodeChildrenL2(node: MapNode) {
	let nodeChildren = GetNodeChildren(node);
	let nodeChildrenL2 = nodeChildren.map(child=>child ? GetNodeL2(child) : null);
	return CachedTransform("GetNodeChildrenL2", [], nodeChildrenL2, ()=>nodeChildrenL2);
}
export function GetNodeChildrenL3(node: MapNode, path: string, filterForPath = false) {
	let nodeChildrenL2 = GetNodeChildrenL2(node);
	let nodeChildrenEnhanced = nodeChildrenL2.map(child=>child ? GetNodeL3(child, path + "/" + child._id) : null);
	if (filterForPath) {
		nodeChildrenEnhanced = nodeChildrenEnhanced.filter(child=> {
			// if null, keep (so receiver knows there's an entry here, but it's still loading)
			if (child == null) return true;
			// filter out any nodes whose access-level is higher than our own
			if (child.current.accessLevel > GetUserAccessLevel(GetUserID())) return false;
			// hide nodes that don't have the required premise-count
			//if (!IsNodeVisibleToNonModNonCreators(child, GetNodeChildren(child)) && !IsUserCreatorOrMod(GetUserID(), child)) return false;
			return true;
		});
	}
	return CachedTransform("GetNodeChildrenEnhanced", [path], nodeChildrenEnhanced, ()=>nodeChildrenEnhanced);
}

export function GetImpactPremiseChildNode(node: MapNodeL2) {
	let nodeChildren = GetNodeChildrenL2(node);
	return CachedTransform("GetImpactPremiseChildNode", [node._id], nodeChildren, ()=>nodeChildren.FirstOrX(a=>a && a.current.impactPremise != null));
}

export function IsLinkValid(parentType: MapNodeType, parentPath: string, child: MapNodeL2) {
	let parentTypeInfo = MapNodeType_Info.for[parentType].childTypes;
	if (!parentTypeInfo.Contains(child.type)) return false;
	return true;
}
export function IsNewLinkValid(parentNode: MapNodeL2, parentPath: string, child: MapNodeL2, permissions: PermissionGroupSet) {
	let parentPathIDs = SplitStringBySlash_Cached(parentPath).map(a=>a.ToInt());
	//if (map.name == "Global" && parentPathIDs.length == 1) return false; // if parent is l1(root), don't accept new children
	if (parentNode._id == globalRootNodeID) return false; // if parent is global-root, don't accept new children
	// if in global map, parent is l2, and user is not a mod (and not node creator), don't accept new children
	if (parentPathIDs[0] == globalRootNodeID && parentPathIDs.length == 2 && !HasModPermissions(permissions) && parentNode.creator != GetUserID()) return false;
	if (parentNode._id == child._id) return false; // cannot link node as its own child

	if (parentNode && (parentNode.children || {}).VKeys(true).Contains(child._id+"")) return false; // if already a child of this parent, reject
	return IsLinkValid(parentNode.type, parentPath, child);
}

export function ForUnlink_GetError(userID: string, map: Map, node: MapNodeL2, asPartOfCut = false) {
	if (!IsUserCreatorOrMod(userID, node)) return "You are not the owner of this node. (or a mod)";
	if (node.current.impactPremise) return "Cannot unlink a impact-premise directly. Instead, delete the parent. (assuming you've deleted the premises already)";
	if (!asPartOfCut && (node.parents || {}).VKeys(true).length <= 1)  return `Cannot unlink this child, as doing so would orphan it. Try deleting it instead.`;
	if (IsRootNode(node)) return `Cannot unlink the root-node of a map.`;
	if (IsNodeSubnode(node)) return `Cannot unlink a subnode. Try deleting it instead.`;
	return null;
}
export function ForDelete_GetError(userID: string, map: Map, node: MapNodeL2, asPartOfMapDelete = false) {
	if (!IsUserCreatorOrMod(userID, node)) return "You are not the owner of this node. (or a mod)";
	if (node.current.impactPremise) return "Cannot delete a impact-premise directly. Instead, delete the parent. (assuming you've deleted the premises already)";
	if (GetParentCount(node) > 1) return `Cannot delete this child, as it has more than one parent. Try unlinking it instead.`;
	if (IsRootNode(node) && !asPartOfMapDelete) return `Cannot delete the root-node of a map.`;

	let nodeChildren = GetNodeChildrenL2(node);
	if (nodeChildren.Any(a=>a == null)) return "[still loading children...]";
	//if ((node.children || {}).VKeys().length) return "Cannot delete this node until all its (non-impact-premise) children have been unlinked or deleted.";
	if (nodeChildren.filter(a=>!a.current.impactPremise).length) return "Cannot delete this node until all its (non-impact-premise) children have been unlinked or deleted.";
	return null;
}

export function ForCut_GetError(userID: string, map: Map, node: MapNodeL2) {
	return ForUnlink_GetError(userID, map, node, true);
}

export function ForCopy_GetError(userID: string, map: Map, node: MapNode) {
	if (IsRootNode(node)) return `Cannot copy the root-node of a map.`;
	if (IsNodeSubnode(node)) return `Cannot copy a subnode.`;
	return null;
}

/*export function GetUnlinkErrorMessage(parent: MapNode, child: MapNode) {
	//let childNodes = node.children.Select(a=>nodes[a]);
	let parentNodes = nodes.Where(a=>a.children && a.children[node._id]);
	if (parentNodes.length <= 1)
}*/