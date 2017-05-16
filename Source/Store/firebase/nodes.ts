import {HasModPermissions, PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import {IsNaN, IsObjectOf, IsObject, IsNumber} from "../../Frame/General/Types";
import {GetData, GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {MapNode} from "./nodes/@MapNode";
import {CachedTransform} from "../../Frame/V/VCache";
import {MapNodeType_Info, MapNodeType} from "./nodes/@MapNodeType";
import {IsUserCreatorOrMod} from "./userExtras";
import {GetUserPermissionGroups, GetUserID} from "./users";
import { GetNodeEnhanced, IsArgumentNode, IsNodeVisibleToNonModNonCreators } from "./nodes/$node";

export function GetNode(id: number) {
	//Assert(id != null && !IsNaN(id), "Node-id cannot be null or NaN.");
	if (id == null || IsNaN(id)) return null;
	return GetData(`nodes/${id}`) as MapNode;
}
export async function GetNodeAsync(id: number) {
	return await GetDataAsync(`nodes/${id}`) as MapNode;
}

export function GetParentNodeID(path: string) {
	let parentIDStr = path.split("/").XFromLast(1);
	return parentIDStr ? parentIDStr.ToInt() : null;
}
export function GetParentNode(path: string) {
	return GetNode(GetParentNodeID(path));
}

export function GetNodeParents(node: MapNode) {
	let parents = (node.parents || {}).VKeys(true).map(id=>GetNode(parseInt(id)));
	return CachedTransform("GetNodeParents", [node._id], parents, ()=>parents);
}
export async function GetNodeParentsAsync(node: MapNode) {
	return await Promise.all(node.parents.VKeys(true).map(parentID=>GetDataAsync(`nodes/${parentID}`))) as MapNode[];
}

/*export function GetNodeChildIDs(nodeID: number) {
	let node = GetNode(nodeID);
	// any time the childIDs changes, we know the node object changes as well; so just cache childIDs on node
	if (node["@childIDs"] == null)
		node.VSet("@childIDs", (node.children || {}).VKeys(true).map(id=>parseInt(id)), {});
	return node["@childIDs"];
}*/
export function GetNodeChildren(node: MapNode) {
	// special case, for demo map
	if (node.children && node.children[0] instanceof MapNode) {
		return node.children as any as MapNode[];
	}

	let children = (node.children || {}).VKeys(true).map(id=>GetNode(parseInt(id)));
	children = children.filter(child=> {
		return child == null || IsNodeVisibleToNonModNonCreators(child) || IsUserCreatorOrMod(GetUserID(), child);
	});
	return CachedTransform("GetNodeChildren", [node._id], children, ()=>children);
}
export async function GetNodeChildrenAsync(node: MapNode) {
	return await Promise.all(node.children.VKeys(true).map(id=>GetDataAsync(`nodes/${id}`))) as MapNode[];
}

export function GetNodeChildrenEnhanced(node: MapNode, path: string) {
	let nodeChildren = GetNodeChildren(node);
	let nodeChildrenEnhanced = nodeChildren.map(child=>child ? GetNodeEnhanced(child, path + "/" + child._id) : null);
	return CachedTransform("GetNodeChildrenEnhanced", [path], nodeChildrenEnhanced, ()=>nodeChildrenEnhanced);
}

export function IsLinkValid(parentType: MapNodeType, parentPath: string, child: MapNode) {
	let parentTypeInfo = MapNodeType_Info.for[parentType].childTypes;
	if (!parentTypeInfo.Contains(child.type)) return false;
	return true;
}
export function IsNewLinkValid(parentType: MapNodeType, parentPath: string, child: MapNode, permissions: PermissionGroupSet) {
	let parentPathIDs = parentPath.split("/").map(a=>a.ToInt());
	if (parentPathIDs.length == 1) return false; // if parent is l1(root), don't accept new children
	if (parentPathIDs.length == 2 && !HasModPermissions(permissions)) return false; // if parent is l2, and user is not a mod, don't accept new children
	let parent = GetNode(parentPathIDs.Last());
	if (parent && (parent.children || {}).VKeys(true).Contains(child._id+"")) return false; // if already a child of this parent, reject
	return IsLinkValid(parentType, parentPath, child);
}

export function ForUnlink_GetError(userID: string, node: MapNode) {
	if (!IsUserCreatorOrMod(userID, node)) return "You are not the owner of this node. (or a mod)";
	if (node.metaThesis) return "Cannot unlink a meta-thesis directly. Instead, delete the parent. (assuming you've deleted the premises already)";
	return null;
}
export function ForDelete_GetError(userID: string, node: MapNode) {
	if (!IsUserCreatorOrMod(userID, node)) return "You are not the owner of this node. (or a mod)";
	if (node.metaThesis) return "Cannot delete a meta-thesis directly. Instead, delete the parent. (assuming you've deleted the premises already)";
	let nodeChildren = GetNodeChildren(node);
	//if ((node.children || {}).VKeys().length) return "Cannot delete this node until all its (non-meta-thesis) children have been deleted or unlinked.";
	if (nodeChildren.filter(a=>!a.metaThesis).length) return "Cannot delete this node until all its (non-meta-thesis) children have been deleted or unlinked.";
	return null;
}

/*export function GetUnlinkErrorMessage(parent: MapNode, child: MapNode) {
	//let childNodes = node.children.Select(a=>nodes[a]);
	let parentNodes = nodes.Where(a=>a.children && a.children[node._id]);
	if (parentNodes.length <= 1)
}*/