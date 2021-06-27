import {emptyArray, emptyArray_forLoading, IsNaN, CE, Assert, A, CreateStringEnum} from "web-vcore/nm/js-vextensions";
import {GetDoc, SlicePath, SplitStringBySlash_Cached, StoreAccessor, UUID} from "web-vcore/nm/mobx-graphlink";
import {GetNodeChildLinks} from "./nodeChildLinks.js";
import {GetNodeRevisionsByTitle} from "./nodeRevisions";
import {AsNodeL1, GetNodeL2, GetNodeL3, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument} from "./nodes/$node";
import {globalRootNodeID, MapNode, MapNodeL2, MapNodeL3, Polarity} from "./nodes/@MapNode";
import {TitleKey} from "./nodes/@MapNodeRevision";
import {MapNodeType, MapNodeType_Info} from "./nodes/@MapNodeType";
import {GetFinalTagCompsForTag, GetNodeTagComps, GetNodeTags} from "./nodeTags";
import {TagComp_MirrorChildrenFromXToY, TagComp_RestrictMirroringOfX, TagComp_XIsExtendedByY} from "./nodeTags/@MapNodeTag";
import {MeID} from "./users";
import {CanGetBasicPermissions, GetUserAccessLevel, HasAdminPermissions, IsUserCreatorOrMod} from "./users/$user";
import {PermissionGroupSet} from "./users/@User";

export enum HolderType {
	truth = "truth",
	relevance = "relevance",
}

export function PathSegmentToNodeID(segment: string): UUID {
	if (segment.length == 22) return segment; // if raw UUID
	if (segment.length == 23) return segment.slice(1); // if UUID, but with marker at front (marking as subnode, I believe)
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
export const GetNodesByIDs = StoreAccessor(s=>(ids: string[], emptyForLoading = true): MapNode[]=>{
	const nodes = ids.map(id=>GetNode(id));
	if (emptyForLoading && CE(nodes).Any(a=>a == null)) return emptyArray_forLoading;
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
/*export async function GetNodeAsync(id: string) {
	return await GetDataAsync("nodes", id) as MapNode;
}*/

export const IsRootNode = StoreAccessor(s=>(node: MapNode)=>{
	if (node.type != MapNodeType.category) return false;
	const parents = GetNodeChildLinks(null, node.id);
	if (parents.length != 0) return false; // todo: probably change this (map root-nodes can have "parents" now I think, due to restructuring)
	return true;
});

export function GetParentPath(childPath: string) {
	const childPathNodes = SplitStringBySlash_Cached(childPath);
	if (childPathNodes.length == 1) return null;
	return childPathNodes.slice(0, -1).join("/");
}
export function GetParentNodeID(path: string) {
	const pathNodes = SplitStringBySlash_Cached(path);
	if (CE(pathNodes).Last()[0] == "*") return null;
	const parentNodeStr = CE(pathNodes).XFromLast(1);
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
	const ownNodeStr = CE(SplitStringBySlash_Cached(path)).LastOrX();
	return ownNodeStr ? PathSegmentToNodeID(ownNodeStr) : null;
});

export function CleanArray<T>(array: T[], emptyArrayIfItemLoading = true) {
	if (emptyArrayIfItemLoading && CE(array).Any(a=>a === undefined)) return emptyArray_forLoading;
	return array;
}

export const GetNodeParents = StoreAccessor(s=>(nodeID: string, emptyForLoading = true)=>{
	const parentLinks = GetNodeChildLinks(null, nodeID);
	return CleanArray(parentLinks.map(a=>GetNode(a.parent)), emptyForLoading);
});
export const GetNodeParentsL2 = StoreAccessor(s=>(nodeID: string, emptyForLoading = true)=>{
	return CleanArray(GetNodeParents(nodeID).map(parent=>(parent ? GetNodeL2(parent) : undefined)), emptyForLoading);
});
export const GetNodeParentsL3 = StoreAccessor(s=>(nodeID: string, path: string, emptyForLoading = true)=>{
	return CleanArray(GetNodeParents(nodeID).map(parent=>(parent ? GetNodeL3(SlicePath(path, 1)) : undefined)), emptyForLoading);
});

export const GetNodeChildren = StoreAccessor(s=>(nodeID: string, includeMirrorChildren = true, tagsToIgnore?: string[], emptyForLoading = true): MapNode[]=>{
	/*let node = GetNode(nodeID);
	if (node == null) return emptyArray;
	// special case, for demo map
	if (node.children && node.children[0] instanceof MapNode) {
		return node.children as any;
	}*/

	const childLinks = GetNodeChildLinks(nodeID);
	let result = childLinks.map(a=>GetNode(a.child));
	if (includeMirrorChildren) {
		//let tags = GetNodeTags(nodeID);
		let tagComps = GetNodeTagComps(nodeID, true, tagsToIgnore);
		// maybe todo: have disable-direct-children merely stop you from adding new direct children, not hide existing ones
		if (CE(tagComps).Any(a=>a instanceof TagComp_MirrorChildrenFromXToY && a.nodeY == nodeID && a.disableDirectChildren)) {
			result = [];
		}
		let mirrorChildren = GetNodeMirrorChildren(nodeID, tagsToIgnore);
		// filter out duplicate children
		mirrorChildren = mirrorChildren.filter(mirrorChild=>!CE(result).Any(directChild=>directChild.id == mirrorChild.id));
		result.push(...mirrorChildren);
	}
	return CleanArray(result, emptyForLoading);
});
export const GetNodeMirrorChildren = StoreAccessor(s=>(nodeID: string, tagsToIgnore?: string[], emptyForLoading = true)=> {
	let tags = GetNodeTags(nodeID).filter(tag=>tag && !tagsToIgnore?.includes(tag.id));
	//let tagComps = GetNodeTagComps(nodeID, true, tagsToIgnore);

	let result = [] as MapNode[];
	for (const tag of tags) {
		const tagComps = GetFinalTagCompsForTag(tag);
		for (const tagComp of tagComps) {
			if (tagComp instanceof TagComp_MirrorChildrenFromXToY && tagComp.nodeY == nodeID) {
				//let comp = tag.mirrorChildrenFromXToY;
				let mirrorChildrenL3 = GetNodeChildrenL3(tagComp.nodeX, undefined, undefined, (tagsToIgnore ?? []).concat(tag.id));
				mirrorChildrenL3 = mirrorChildrenL3.filter(child=> {
					if (child == null) return false;
					let childTagComps = GetNodeTagComps(child.id, true, (tagsToIgnore ?? []).concat(tag.id));
					if (childTagComps == emptyArray_forLoading) return false; // don't include child until we're sure it's allowed to be mirrored
					const mirroringBlacklisted = CE(childTagComps).Any(comp=> {
						if (!(comp instanceof TagComp_RestrictMirroringOfX)) return false;
						return comp.blacklistAllMirrorParents || comp.blacklistedMirrorParents?.includes(nodeID);
					});
					if (mirroringBlacklisted) return false;
					return (child.link.polarity == Polarity.supporting && tagComp.mirrorSupporting) || (child.link.polarity == Polarity.opposing && tagComp.mirrorOpposing);
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
				let mirrorChildrenL1 = mirrorChildrenL3.map(childL3=>AsNodeL1(childL3));
				result.push(...mirrorChildrenL1);
			}
		}
	}

	// exclude any mirror-child which is an extension of (ie. wider/weaker than) another child (that is, if it's the Y of an "X is extended by Y" tag, between children) 
	result = result.filter(child=> {
		let childTagComps = GetNodeTagComps(child.id, true, tagsToIgnore);
		const extensionOfAnotherMirrorChild = CE(childTagComps).Any(comp=> {
			if (!(comp instanceof TagComp_XIsExtendedByY)) return false;
			let childIsNodeY = comp.nodeY == child.id;
			if (!childIsNodeY) return false;

			let nodeDirectChildren = GetNodeChildren(nodeID, false);
			let otherChildIsNodeX = CE(nodeDirectChildren.concat(result)).Any(otherChild=>comp.nodeX == otherChild.id);
			return otherChildIsNodeX;
		});
		if (extensionOfAnotherMirrorChild) return false;

		if (IsSinglePremiseArgument(child)) {
			let childPremise = GetPremiseOfSinglePremiseArgument(child.id);
			if (childPremise) {
				let childPremiseTagComps = GetNodeTagComps(childPremise.id, true, tagsToIgnore);
				const premiseIsExtensionOfAnotherMirrorChildPremise = CE(childPremiseTagComps).Any(comp=> {
					if (!(comp instanceof TagComp_XIsExtendedByY)) return false;
					let childPremiseIsNodeY = comp.nodeY == childPremise.id;
					if (!childPremiseIsNodeY) return false;

					let nodeDirectChildren = GetNodeChildren(nodeID, false);
					let otherChildPremiseIsNodeX = CE(nodeDirectChildren.concat(result)).Any(otherChild=>{
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
	result = result.filter((node, index)=> {
		let earlierNodes = result.slice(0, index);
		return !CE(earlierNodes).Any(a=>a.id == node.id);
	});

	return CleanArray(result, emptyForLoading);
});

export const GetNodeChildrenL2 = StoreAccessor(s=>(nodeID: string, includeMirrorChildren = true, tagsToIgnore?: string[], emptyForLoading = true)=>{
	const nodeChildren = GetNodeChildren(nodeID, includeMirrorChildren, tagsToIgnore);
	let nodeChildrenL2 = nodeChildren.map(child=>(child ? GetNodeL2(child) : undefined));
	return CleanArray(nodeChildrenL2, emptyForLoading);
});
export const GetNodeChildrenL3 = StoreAccessor(s=>(nodeID: string, path?: string, includeMirrorChildren = true, tagsToIgnore?: string[], emptyForLoading = true): MapNodeL3[]=>{
	path = path || nodeID;

	const nodeChildrenL2 = GetNodeChildrenL2(nodeID, includeMirrorChildren, tagsToIgnore);
	let nodeChildrenL3 = nodeChildrenL2.map(child=>(child ? GetNodeL3(`${path}/${child.id}`, tagsToIgnore) : undefined));
	return CleanArray(nodeChildrenL3, emptyForLoading);
});

export const GetPremiseOfSinglePremiseArgument = StoreAccessor(s=>(argumentNodeID: string)=>{
	let argument = GetNode(argumentNodeID);
	let children = GetNodeChildren(argumentNodeID, false);
	let childPremise = children.find(child=>child && IsPremiseOfSinglePremiseArgument(child, argument));
	return childPremise;
});

export function GetHolderType(childType: MapNodeType, parentType: MapNodeType) {
	if (parentType == MapNodeType.argument) {
		if (childType == MapNodeType.argument) return HolderType.relevance;
	} else if (parentType == MapNodeType.claim) {
		if (childType == MapNodeType.argument) return HolderType.truth;
	}
	return null;
}

export const ForLink_GetError = StoreAccessor(s=>(parentType: MapNodeType, childType: MapNodeType)=>{
	const parentTypeInfo = MapNodeType_Info.for[parentType].childTypes;
	if (!parentTypeInfo?.includes(childType)) return `The child's type (${MapNodeType[childType]}) is not valid for the parent's type (${MapNodeType[parentType]}).`;
});
export const ForNewLink_GetError = StoreAccessor(s=>(parentID: string, newChild: Pick<MapNode, "id" | "type">, permissions: PermissionGroupSet, newHolderType?: HolderType)=>{
	if (!CanGetBasicPermissions(permissions)) return "You're not signed in, or lack basic permissions.";
	const parent = GetNode(parentID);
	if (parent == null) return "Parent data not found.";
	// const parentPathIDs = SplitStringBySlash_Cached(parentPath).map(a => a.ToInt());
	// if (map.name == "Global" && parentPathIDs.length == 1) return false; // if parent is l1(root), don't accept new children
	if (parent.id == globalRootNodeID && !HasAdminPermissions(permissions)) return "Only admins can add children to the global-root.";
	// if in global map, parent is l2, and user is not a mod (and not node creator), don't accept new children
	// if (parentPathIDs[0] == globalRootNodeID && parentPathIDs.length == 2 && !HasModPermissions(permissions) && parent.creator != MeID()) return false;
	if (parent.id == newChild.id) return "Cannot link node as its own child.";

	const parentChildLinks = GetNodeChildLinks(parentID);
	const isAlreadyChild = parentChildLinks.Any(a=>a.child == newChild.id);
	// if new-holder-type is not specified, consider "any" and so don't check
	if (newHolderType !== undefined) {
		const currentHolderType = GetHolderType(newChild.type, parent.type);
		if (isAlreadyChild && currentHolderType == newHolderType) return false; // if already a child of this parent, reject (unless it's a claim, in which case allow, as can be)
	}
	return ForLink_GetError(parent.type, newChild.type);
});

export const ForDelete_GetError = StoreAccessor(s=>(userID: string, node: MapNodeL2, subcommandInfo?: {asPartOfMapDelete?: boolean, parentsToIgnore?: string[], childrenToIgnore?: string[]})=>{
	const baseText = `Cannot delete node #${node.id}, since `;
	if (!IsUserCreatorOrMod(userID, node)) return `${baseText}you are not the owner of this node. (or a mod)`;
	const parentLinks = GetNodeChildLinks(null, node.id);
	if (parentLinks.map(a=>a.parent).Except(...subcommandInfo?.parentsToIgnore ?? []).length > 1) return `${baseText}it has more than one parent. Try unlinking it instead.`;
	if (IsRootNode(node) && !subcommandInfo?.asPartOfMapDelete) return `${baseText}it's the root-node of a map.`;

	const nodeChildren = GetNodeChildrenL2(node.id);
	if (CE(nodeChildren).Any(a=>a == null)) return "[still loading children...]";
	if (CE(nodeChildren.map(a=>a.id)).Except(...(subcommandInfo?.childrenToIgnore ?? [])).length) {
		return `Cannot delete this node (#${node.id}) until all its children have been unlinked or deleted.`;
	}
	return null;
});

export const ForCut_GetError = StoreAccessor(s=>(userID: string, node: MapNodeL2)=>{
	const baseText = `Cannot unlink node #${node.id}, since `;
	if (!IsUserCreatorOrMod(userID, node)) return `${baseText}you are not its owner. (or a mod)`;
	//if (!asPartOfCut && (node.parents || {}).VKeys().length <= 1) return `${baseText}doing so would orphan it. Try deleting it instead.`;
	if (IsRootNode(node)) return `${baseText}it's the root-node of a map.`;
	//if (IsNodeSubnode(node)) return `${baseText}it's a subnode. Try deleting it instead.`;
	return null;
});

export const ForCopy_GetError = StoreAccessor(s=>(userID: string, node: MapNode)=>{
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