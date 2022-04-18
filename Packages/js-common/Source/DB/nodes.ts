import {Assert, CE, emptyArray_forLoading, GetValues, IsString} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, BailError, CreateAccessor, GetDoc, MapWithBailHandling, SlicePath, SplitStringBySlash_Cached, UUID, Validate} from "web-vcore/nm/mobx-graphlink.js";
import {MapNodeL3} from "../DB.js";
import {globalRootNodeID} from "../DB_Constants.js";
import {GetNodeChildLinks} from "./nodeChildLinks.js";
import {TitleKey} from "./nodePhrasings/@MapNodePhrasing.js";
import {AsNodeL1, GetNodeL2, GetNodeL3, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument} from "./nodes/$node.js";
import {MapNode, MapNodeL2, Polarity} from "./nodes/@MapNode.js";
import {ChildGroup, MapNodeType, MapNodeType_Info} from "./nodes/@MapNodeType.js";
import {GetFinalTagCompsForTag, GetNodeTagComps, GetNodeTags} from "./nodeTags.js";
import {TagComp_MirrorChildrenFromXToY, TagComp_RestrictMirroringOfX, TagComp_XIsExtendedByY} from "./nodeTags/@MapNodeTag.js";
import {CanGetBasicPermissions, HasAdminPermissions, IsUserCreatorOrMod} from "./users/$user.js";
import {PermissionGroupSet} from "./users/@User.js";

export function GetPathNodes(path: string) {
	const pathSegments = SplitStringBySlash_Cached(path);
	//Assert(pathSegments.every(a=>Validate("UUID", a) == null || a[0] == "*"), `Path contains non-uuid, non-*-prefixed segments: ${path}`);
	Assert(pathSegments.every(a=>a.length == 22 || a[0] == "*"), `Path contains non-uuid, non-*-prefixed segments: ${path}`); // Validate("UUID", a) is too slow, so just check length
	// return pathSegments.map(ToInt);
	return pathSegments;
}
export function ToPathStr(pathOrPathNodes: string | string[]) {
	return IsString(pathOrPathNodes) ? pathOrPathNodes : pathOrPathNodes.join("/");
}
export function ToPathNodes(pathOrPathNodes: string | string[]) {
	return IsString(pathOrPathNodes) ? GetPathNodes(pathOrPathNodes) : pathOrPathNodes;
}
export function GetPathNodeIDs(path: string): UUID[] {
	const nodes = GetPathNodes(path);
	return nodes.map(a=>PathSegmentToNodeID(a));
}
export function PathSegmentToNodeID(segment: string|n): UUID {
	if (segment?.length == 22) return segment; // if raw UUID
	if (segment?.length == 23) return segment.slice(1); // if UUID, but with marker at front (marking as subnode, I believe)
	Assert(false, "Segment text is invalid.");
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
export const GetNodesByIDs = CreateAccessor((ids: string[]): MapNode[]=>{
	//return ids.map(id=>GetNode[emptyForLoading ? "BIN" : "Normal"](id));
	return ids.map(id=>GetNode.BIN(id));
});
/*export const GetNodesByTitle = CreateAccessor((title: string, titleKey: TitleKey): MapNode[]=>{
	const nodeRevisions = GetNodeRevisionsByTitle(title, titleKey);
	return nodeRevisions.map(a=>GetNode.BIN(a.node));
});*/

export const GetNode = CreateAccessor((id: string|n)=>{
	return GetDoc({}, a=>a.nodes.get(id!));
});
/*export async function GetNodeAsync(id: string) {
	return await GetDataAsync("nodes", id) as MapNode;
}*/

export const IsRootNode = CreateAccessor((node: MapNode)=>{
	if (node.type != MapNodeType.category) return false;
	const parents = GetNodeChildLinks(undefined, node.id);
	if (parents.length != 0) return false; // todo: probably change this (map root-nodes can have "parents" now I think, due to restructuring)
	return true;
});

export function GetParentPath(childPath: string|n) {
	if (childPath == null) return null;
	const childPathNodes = SplitStringBySlash_Cached(childPath);
	if (childPathNodes.length == 1) return null;
	return childPathNodes.slice(0, -1).join("/");
}
export function GetParentNodeID(path: string|n) {
	if (path == null) return null;
	const pathNodes = SplitStringBySlash_Cached(path);
	if (CE(pathNodes).Last()[0] == "*") return null;
	const parentNodeStr = CE(pathNodes).XFromLast(1);
	return parentNodeStr ? PathSegmentToNodeID(parentNodeStr) : null;
}

export const GetParentNode = CreateAccessor((childPath: string|n)=>{
	return GetNode(GetParentNodeID(childPath));
});
export const GetParentNodeL2 = CreateAccessor((childPath: string|n)=>{
	return GetNodeL2(GetParentNodeID(childPath));
});
export const GetParentNodeL3 = CreateAccessor((childPath: string|n)=>{
	return GetNodeL3(GetParentPath(childPath));
});
export const GetNodeID = CreateAccessor(<{
	(path: string): string;
	(path: string|n): string|n;
}>((path: string|n)=>{
	if (path == null) return null;
	const ownNodeStr = CE(SplitStringBySlash_Cached(path)).LastOrX();
	Assert(ownNodeStr, `Invalid path:${path}`);
	return PathSegmentToNodeID(ownNodeStr);
}));

export const GetNodeParents = CreateAccessor((nodeID: string)=>{
	const parentLinks = GetNodeChildLinks(undefined, nodeID);
	return parentLinks.map(a=>GetNode.BIN(a.parent)); // BIN: we know link exists, so parent-node should as well (so null must mean change loading)
});
export const GetNodeParentsL2 = CreateAccessor((nodeID: string)=>{
	return MapWithBailHandling(GetNodeParents(nodeID), parent=>GetNodeL2.BIN(parent)); // BIN: we know parent exists, so l2-data should as well (so null must mean change loading)
});
/*export const GetNodeParentsL3 = CreateAccessor((nodeID: string, path: string)=>{
	return MapWithBailHandling(GetNodeParents(nodeID), parent=>GetNodeL3.BIN(SlicePath(path, 1))); // BIN: we know parent exists, so l3-data should as well (so null must mean change loading)
});*/

export const GetNodeChildren = CreateAccessor((nodeID: string, includeMirrorChildren = true, tagsToIgnore?: string[])=>{
	/*let node = GetNode(nodeID);
	if (node == null) return emptyArray;
	// special case, for demo map
	if (node.children && node.children[0] instanceof MapNode) {
		return node.children as any;
	}*/

	const childLinks = GetNodeChildLinks(nodeID);
	/*let result = childLinks.map(link=>{
		if (c.catchItemBails) return GetNode.CatchBail(c.catchItemBails_asX, link.child);
		return GetNode(link.child);
	});*/
	//let result = MapWithBailHandling(childLinks, link=>GetNode.BIN(link.child)); // BIN: we know link exists, so child-node should as well (so null must mean change loading)
	let result = MapWithBailHandling(childLinks, link=>GetNode(link.child) as MapNode);
	if (includeMirrorChildren) {
		//let tags = GetNodeTags(nodeID);
		const tagComps = GetNodeTagComps(nodeID, true, tagsToIgnore);
		// maybe todo: have disable-direct-children merely stop you from adding new direct children, not hide existing ones
		if (CE(tagComps).Any(a=>a instanceof TagComp_MirrorChildrenFromXToY && a.nodeY == nodeID && a.disableDirectChildren)) {
			result = [];
		}
		//let mirrorChildren = GetNodeMirrorChildren(nodeID, tagsToIgnore, catchBailsAsNullItems);
		let mirrorChildren = GetNodeMirrorChildren(nodeID, tagsToIgnore); // maybe todo: MS GetNodeMirrorChildren() supports "catchItemBails" opt, and use it
		// filter out duplicate children
		mirrorChildren = mirrorChildren.filter(mirrorChild=>!CE(result).Any(directChild=>directChild?.id == mirrorChild.id));
		result.push(...mirrorChildren);
	}
	return result;
});
export const GetNodeMirrorChildren = CreateAccessor((nodeID: string, tagsToIgnore?: string[])=>{
	const tags = GetNodeTags(nodeID).filter(tag=>tag && !tagsToIgnore?.includes(tag.id));
	//let tagComps = GetNodeTagComps(nodeID, true, tagsToIgnore);

	let result = [] as MapNode[];
	for (const tag of tags) {
		const tagComps = GetFinalTagCompsForTag(tag);
		for (const tagComp of tagComps) {
			if (tagComp instanceof TagComp_MirrorChildrenFromXToY && tagComp.nodeY == nodeID) {
				//let comp = tag.mirrorChildrenFromXToY;
				let mirrorChildrenL3 = GetNodeChildrenL3(tagComp.nodeX, undefined, undefined, (tagsToIgnore ?? []).concat(tag.id));
				mirrorChildrenL3 = mirrorChildrenL3.filter(child=>{
					if (child == null) return false;
					const childTagComps = GetNodeTagComps(child.id, true, (tagsToIgnore ?? []).concat(tag.id));
					if (childTagComps == emptyArray_forLoading) return false; // don't include child until we're sure it's allowed to be mirrored
					const mirroringBlacklisted = CE(childTagComps).Any(comp=>{
						if (!(comp instanceof TagComp_RestrictMirroringOfX)) return false;
						return comp.blacklistAllMirrorParents || comp.blacklistedMirrorParents?.includes(nodeID);
					});
					if (mirroringBlacklisted) return false;
					return (child.link?.polarity == Polarity.supporting && tagComp.mirrorSupporting) || (child.link?.polarity == Polarity.opposing && tagComp.mirrorOpposing);
				});

				/*if (comp.reversePolarities) {
					mirrorChildren = mirrorChildren.map(child=> {
						let newChild = child;
						if (child.link.polarity) {
							newChild = Clone(child).VSet({_key: child.id}) as MapNodeL3;
							newChild.link.polarity = ReversePolarity(newChild.link.polarity);
						}
						return newChild;
					});
				}*/
				const mirrorChildrenL1 = mirrorChildrenL3.map(childL3=>AsNodeL1(childL3));
				result.push(...mirrorChildrenL1);
			}
		}
	}

	// exclude any mirror-child which is an extension of (ie. wider/weaker than) another child (that is, if it's the Y of an "X is extended by Y" tag, between children) 
	result = result.filter(child=>{
		const childTagComps = GetNodeTagComps(child.id, true, tagsToIgnore);
		const extensionOfAnotherMirrorChild = CE(childTagComps).Any(comp=>{
			if (!(comp instanceof TagComp_XIsExtendedByY)) return false;
			const childIsNodeY = comp.nodeY == child.id;
			if (!childIsNodeY) return false;

			const nodeDirectChildren = GetNodeChildren(nodeID, false);
			const otherChildIsNodeX = CE(nodeDirectChildren.concat(result)).Any(otherChild=>comp.nodeX == otherChild.id);
			return otherChildIsNodeX;
		});
		if (extensionOfAnotherMirrorChild) return false;

		if (IsSinglePremiseArgument(child)) {
			const childPremise = GetPremiseOfSinglePremiseArgument(child.id);
			if (childPremise) {
				const childPremiseTagComps = GetNodeTagComps(childPremise.id, true, tagsToIgnore);
				const premiseIsExtensionOfAnotherMirrorChildPremise = CE(childPremiseTagComps).Any(comp=>{
					if (!(comp instanceof TagComp_XIsExtendedByY)) return false;
					const childPremiseIsNodeY = comp.nodeY == childPremise.id;
					if (!childPremiseIsNodeY) return false;

					const nodeDirectChildren = GetNodeChildren(nodeID, false);
					const otherChildPremiseIsNodeX = CE(nodeDirectChildren.concat(result)).Any(otherChild=>{
						return IsSinglePremiseArgument(otherChild) && comp.nodeX == GetPremiseOfSinglePremiseArgument(otherChild.id)?.id;
					});
					return otherChildPremiseIsNodeX;
				});
				if (premiseIsExtensionOfAnotherMirrorChildPremise) return false;
			}
		}

		return true;
	});

	// filter out duplicate children
	result = result.filter((node, index)=>{
		const earlierNodes = result.slice(0, index);
		return !CE(earlierNodes).Any(a=>a.id == node.id);
	});

	return result;
});

export const GetNodeChildrenL2 = CreateAccessor((nodeID: string, includeMirrorChildren = true, tagsToIgnore?: string[])=>{
	const nodeChildren = GetNodeChildren(nodeID, includeMirrorChildren, tagsToIgnore);
	const nodeChildrenL2 = MapWithBailHandling(nodeChildren, child=>GetNodeL2.BIN(child)); // BIN: we know node exists, so l2-data should as well (so null must mean change loading)
	return nodeChildrenL2;
});
export const GetNodeChildrenL3 = CreateAccessor((nodeID: string, path?: string, includeMirrorChildren = true, tagsToIgnore?: string[])=>{
	path = path || nodeID;
	const nodeChildrenL2 = GetNodeChildrenL2(nodeID, includeMirrorChildren, tagsToIgnore);
	const nodeChildrenL3 = MapWithBailHandling(nodeChildrenL2, child=>GetNodeL3.BIN(`${path}/${child.id}`, tagsToIgnore)); // BIN: we know node exists, so l3-data should as well (so null must mean change loading)
	return nodeChildrenL3;
});

export const GetPremiseOfSinglePremiseArgument = CreateAccessor((argumentNodeID: string)=>{
	const argument = GetNode.BIN(argumentNodeID);
	const children = GetNodeChildren(argumentNodeID, false);
	const childPremise = children.find(child=>child && IsPremiseOfSinglePremiseArgument(child, argument));
	return childPremise;
});

export function GetChildGroup(childType: MapNodeType, parentType: MapNodeType|n) {
	if (parentType == MapNodeType.argument) {
		if (childType == MapNodeType.argument) return ChildGroup.relevance;
	} else if (parentType == MapNodeType.claim) {
		if (childType == MapNodeType.argument) return ChildGroup.truth;
	}
	return ChildGroup.generic;
}

export const ForLink_GetError = CreateAccessor((parentType: MapNodeType, childType: MapNodeType, childGroup: ChildGroup)=>{
	const validChildTypes = MapNodeType_Info.for[parentType].childGroup_childTypes.get(childGroup) ?? [];
	if (!validChildTypes.includes(childType)) return `The child's type (${MapNodeType[childType]}) is not valid here. (parent type: ${MapNodeType[parentType]}, child group: ${ChildGroup[childGroup]}).`;
});
export const ForNewLink_GetError = CreateAccessor((parentID: string, newChild: Pick<MapNode, "id" | "type">, permissions: PermissionGroupSet, newChildGroup: ChildGroup)=>{
	if (!CanGetBasicPermissions(permissions)) return "You're not signed in, or lack basic permissions.";
	const parent = GetNode(parentID);
	if (parent == null) return "Parent data not found.";
	// const parentPathIDs = SplitStringBySlash_Cached(parentPath).map(a => a.ToInt());
	// if (map.name == "Global" && parentPathIDs.length == 1) return false; // if parent is l1(root), don't accept new children
	if (parent.id == globalRootNodeID && !HasAdminPermissions(permissions)) return "Only admins can add children to the global-root.";
	// if in global map, parent is l2, and user is not a mod (and not node creator), don't accept new children
	// if (parentPathIDs[0] == globalRootNodeID && parentPathIDs.length == 2 && !HasModPermissions(permissions) && parent.creator != MeID()) return false;
	if (parent.id == newChild.id) return "Cannot link node as its own child.";

	const parentChildLinks = GetNodeChildLinks(parentID, null, newChildGroup); // query it with "childID" null, so it's cached once for all such calls
	const isAlreadyChild = parentChildLinks.Any(a=>a.child == newChild.id);

	// if new-holder-type is not specified, consider "any" and so don't check
	/*if (newChildGroup !== undefined) {
		const currentChildGroup = GetChildGroup(newChild.type, parent.type);
		if (isAlreadyChild && currentChildGroup == newChildGroup) return false; // if already a child of this parent, reject (unless it's a claim, in which case allow, as can be)
	}*/
	if (isAlreadyChild) return false;

	return ForLink_GetError(parent.type, newChild.type, newChildGroup);
});

export const ForDelete_GetError = CreateAccessor((userID: string|n, node: MapNodeL2, subcommandInfo?: {asPartOfMapDelete?: boolean, parentsToIgnore?: string[], childrenToIgnore?: string[]})=>{
	const baseText = `Cannot delete node #${node.id}, since `;
	if (!IsUserCreatorOrMod(userID, node)) return `${baseText}you are not the owner of this node. (or a mod)`;
	const parentLinks = GetNodeChildLinks(undefined, node.id);
	if (parentLinks.map(a=>a.parent).Exclude(...subcommandInfo?.parentsToIgnore ?? []).length > 1) return `${baseText}it has more than one parent. Try unlinking it instead.`;
	if (IsRootNode(node) && !subcommandInfo?.asPartOfMapDelete) return `${baseText}it's the root-node of a map.`;

	const nodeChildren = GetNodeChildrenL2(node.id);
	if (CE(nodeChildren).Any(a=>a == null)) return "[still loading children...]";
	if (CE(nodeChildren.map(a=>a.id)).Exclude(...(subcommandInfo?.childrenToIgnore ?? [])).length) {
		return `Cannot delete this node (#${node.id}) until all its children have been unlinked or deleted.`;
	}
	return null;
});

export const ForCut_GetError = CreateAccessor((userID: string|n, node: MapNodeL2)=>{
	const baseText = `Cannot unlink node #${node.id}, since `;
	if (!IsUserCreatorOrMod(userID, node)) return `${baseText}you are not its owner. (or a mod)`;
	//if (!asPartOfCut && (node.parents || {}).VKeys().length <= 1) return `${baseText}doing so would orphan it. Try deleting it instead.`;
	if (IsRootNode(node)) return `${baseText}it's the root-node of a map.`;
	//if (IsNodeSubnode(node)) return `${baseText}it's a subnode. Try deleting it instead.`;
	return null;
});

export const ForCopy_GetError = CreateAccessor((userID: string|n, node: MapNode)=>{
	if (!CanGetBasicPermissions(userID)) return "You're not signed in, or lack basic permissions.";
	if (IsRootNode(node)) return "Cannot copy the root-node of a map.";
	//if (IsNodeSubnode(node)) return "Cannot copy a subnode.";
	return null;
});

/* export function GetUnlinkErrorMessage(parent: MapNode, child: MapNode) {
	//let childNodes = node.children.Select(a=>nodes[a]);
	let parentNodes = nodes.filter(a=>a.children && a.children[node._id]);
	if (parentNodes.length <= 1)
} */