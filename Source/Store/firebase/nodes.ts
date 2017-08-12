import {HasModPermissions, PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import {IsNaN, IsObjectOf, IsObject, IsNumber} from "../../Frame/General/Types";
import {GetData, GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {MapNode, globalRootNodeID} from "./nodes/@MapNode";
import {CachedTransform} from "../../Frame/V/VCache";
import {MapNodeType_Info, MapNodeType} from "./nodes/@MapNodeType";
import {IsUserCreatorOrMod} from "./userExtras";
import {GetUserPermissionGroups, GetUserID, GetUserAccessLevel} from "./users";
import {GetNodeEnhanced, IsArgumentNode} from "./nodes/$node";
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
/*export function GetNodes_Enhanced(): MapNode[] {
	let nodeMap = GetNodeMap();
	return CachedTransform("GetNodes_Enhanced", [], nodeMap, ()=>nodeMap ? nodeMap.VValues(true) : []);
}*/

export function GetNode(id: number) {
	//Assert(id != null && !IsNaN(id), "Node-id cannot be null or NaN.");
	if (id == null || IsNaN(id)) return null;
	return GetData("nodes", id) as MapNode;
}
export async function GetNodeAsync(id: number) {
	return await GetDataAsync("nodes", id) as MapNode;
}

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
export function GetParentNode(path: string) {
	return GetNode(GetParentNodeID(path));
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

export function GetNodeChildrenEnhanced(node: MapNode, path: string, filterForPath = false) {
	let nodeChildren = GetNodeChildren(node);
	let nodeChildrenEnhanced = nodeChildren.map(child=>child ? GetNodeEnhanced(child, path + "/" + child._id) : null);
	if (filterForPath) {
		nodeChildrenEnhanced = nodeChildrenEnhanced.filter(child=> {
			// if null, keep (so receiver knows there's an entry here, but it's still loading)
			if (child == null) return true;
			// filter out any nodes whose access-level is higher than our own
			if (child.accessLevel > GetUserAccessLevel(GetUserID())) return false;
			// hide nodes that don't have the required premise-count
			//if (!IsNodeVisibleToNonModNonCreators(child, GetNodeChildren(child)) && !IsUserCreatorOrMod(GetUserID(), child)) return false;
			return true;
		});
	}
	return CachedTransform("GetNodeChildrenEnhanced", [path], nodeChildrenEnhanced, ()=>nodeChildrenEnhanced);
}

export function GetMetaThesisChildNode(node: MapNode) {
	let nodeChildren = GetNodeChildren(node);
	return CachedTransform("GetMetaThesisChildNode", [node._id], nodeChildren, ()=>nodeChildren.FirstOrX(a=>a && a.metaThesis != null));
}

export function IsLinkValid(parentType: MapNodeType, parentPath: string, child: MapNode) {
	let parentTypeInfo = MapNodeType_Info.for[parentType].childTypes;
	if (!parentTypeInfo.Contains(child.type)) return false;
	return true;
}
export function IsNewLinkValid(parentNode: MapNode, parentPath: string, child: MapNode, permissions: PermissionGroupSet) {
	let parentPathIDs = SplitStringBySlash_Cached(parentPath).map(a=>a.ToInt());
	//if (map.name == "Global" && parentPathIDs.length == 1) return false; // if parent is l1(root), don't accept new children
	if (parentNode._id == globalRootNodeID) return false; // if parent is global-root, don't accept new children
	// if parent is l2, and user is not a mod (and not node creator), don't accept new children
	if (parentPathIDs.length == 2 && !HasModPermissions(permissions) && parentNode.creator != GetUserID()) return false;
	if (parentNode._id == child._id) return false; // cannot link node as its own child

	let parent = GetNode(parentPathIDs.Last());
	if (parent && (parent.children || {}).VKeys(true).Contains(child._id+"")) return false; // if already a child of this parent, reject
	return IsLinkValid(parentNode.type, parentPath, child);
}

export function ForUnlink_GetError(userID: string, map: Map, node: MapNode, asPartOfCut = false) {
	if (!IsUserCreatorOrMod(userID, node)) return "You are not the owner of this node. (or a mod)";
	if (node.metaThesis) return "Cannot unlink a meta-thesis directly. Instead, delete the parent. (assuming you've deleted the premises already)";
	if (!asPartOfCut && (node.parents || {}).VKeys(true).length <= 1)  return `Cannot unlink this child, as doing so would orphan it. Try deleting it instead.`;
	if (IsRootNode(node)) return `Cannot unlink the root-node of a map.`;
	if (IsNodeSubnode(node)) return `Cannot unlink a subnode. Try deleting it instead.`;
	return null;
}
export function ForDelete_GetError(userID: string, map: Map, node: MapNode) {
	if (!IsUserCreatorOrMod(userID, node)) return "You are not the owner of this node. (or a mod)";
	if (node.metaThesis) return "Cannot delete a meta-thesis directly. Instead, delete the parent. (assuming you've deleted the premises already)";
	if (GetParentCount(node) > 1) return `Cannot delete this child, as it has more than one parent. Try unlinking it instead.`;
	if (IsRootNode(node)) return `Cannot delete the root-node of a map.`;

	let nodeChildren = GetNodeChildren(node);
	if (nodeChildren.Any(a=>a == null)) return "[still loading children...]";
	//if ((node.children || {}).VKeys().length) return "Cannot delete this node until all its (non-meta-thesis) children have been unlinked or deleted.";
	if (nodeChildren.filter(a=>!a.metaThesis).length) return "Cannot delete this node until all its (non-meta-thesis) children have been unlinked or deleted.";
	return null;
}

export function ForCut_GetError(userID: string, map: Map, node: MapNode) {
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