import {IsNaN, IsObjectOf, IsObject, IsNumber} from "../../Frame/General/Types";
import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {MapNode} from "./nodes/@MapNode";
import {CachedTransform} from "../../Frame/V/VCache";

//export function GetNode_Path() {}
export function GetNode(id: number) {
	//Assert(id != null && !IsNaN(id), "Node-id cannot be null or NaN.");
	if (id == null || IsNaN(id)) return null;
	return GetData(`nodes/${id}`) as MapNode;
}
export function GetParentNode(path: string) {
	return GetNode(path.split("/").map(a=>parseInt(a)).XFromLast(1));
}

/*export var MakeGetNodeChildIDs = ()=>createSelector(
	(_, {node}: {node: MapNode})=>node.children,
	nodeChildren=> {
		return (nodeChildren || {}).VKeys().Except("_key").Select(a=>parseInt(a));
	}
);*/
/*export function GetNodeChildIDs(nodeOrID: MapNode | number) {
	let node = IsNumber(nodeOrID) ? GetNode(nodeOrID) : nodeOrID;
	let childIDs = (node.children || {}).VKeys().Except("_key").map(id=>parseInt(id));
	return CachedTransform({nodeID: node._id}, childIDs, ()=>childIDs);
}*/
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

/*export function MakeGetNodeChildren() {
	var getNodeChildIDs = MakeGetNodeChildIDs();
	return createSelector(
		({firebase})=>firebase,
		getNodeChildIDs,
		(firebase, childIDs)=> {
			if (firebase == null) debugger;
			return childIDs.Select(a=>GetData(firebase, `nodes/${a}`)).Where(a=>a);
		}
	);
}*/
/*export function MakeGetNodeChildren() {
	var getNodeChildIDs = MakeGetNodeChildIDs();
	return createSelector(
		getNodeChildIDs,
		childIDs=> {
			let firebase = store.getState().firebase;
			if (firebase == null) debugger;
			return childIDs.Select(a=>GetData(firebase, `nodes/${a}`)).Where(a=>a);
		}
	);
}*/