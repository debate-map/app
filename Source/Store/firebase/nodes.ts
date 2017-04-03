import {IsNaN, IsObjectOf, IsObject, IsNumber} from "../../Frame/General/Types";
import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {MapNode} from "./nodes/@MapNode";
import {CachedTransform} from "../../Frame/V/VCache";
import {MapNodeType_Info} from "./nodes/@MapNodeType";

export function GetNode(id: number) {
	//Assert(id != null && !IsNaN(id), "Node-id cannot be null or NaN.");
	if (id == null || IsNaN(id)) return null;
	return GetData(`nodes/${id}`) as MapNode;
}
export function GetParentNode(path: string) {
	return GetNode(path.split("/").map(a=>parseInt(a)).XFromLast(1));
}

export function GetNodeChildIDs(nodeID: number) {
	let node = GetNode(nodeID);
	// any time the childIDs changes, we know the node object changes as well; so just cache childIDs on node
	if (node["@childIDs"] == null)
		node._Set("@childIDs", (node.children || {}).VKeys().Except("_key").map(id=>parseInt(id)));
	return node["@childIDs"];
}
export function GetNodeChildren(node: MapNode) {
	let children = (node.children || {}).VKeys().Except("_key").map(id=>GetNode(parseInt(id)));
	return CachedTransform({nodeID: node._id}, children, ()=>children);
}

export function IsLinkValid(parent: MapNode, child: MapNode) {
	let parentTypeInfo = MapNodeType_Info.for[parent.type].childTypes;
	if (!parentTypeInfo.Contains(child.type))
		return false;
	return true;
}