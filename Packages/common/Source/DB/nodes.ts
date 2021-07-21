import {emptyArray, emptyArray_forLoading, IsNaN, CE, Assert, A, CreateStringEnum} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, SlicePath, SplitStringBySlash_Cached, CreateAccessor, UUID} from "web-vcore/nm/mobx-graphlink.js";
import {globalRootNodeID} from "../DB_Constants.js";
import {GetNodeChildLinks} from "./nodeChildLinks.js";
import {GetNodeRevisionsByTitle} from "./nodeRevisions.js";
import {AsNodeL1, GetNodeL2, GetNodeL3, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument} from "./nodes/$node.js";
import {MapNode, MapNodeL2, MapNodeL3, Polarity} from "./nodes/@MapNode.js";
import {TitleKey} from "./nodes/@MapNodeRevision.js";
import {MapNodeType, MapNodeType_Info} from "./nodes/@MapNodeType.js";
import {GetFinalTagCompsForTag, GetNodeTagComps, GetNodeTags} from "./nodeTags.js";
import {TagComp_MirrorChildrenFromXToY, TagComp_RestrictMirroringOfX, TagComp_XIsExtendedByY} from "./nodeTags/@MapNodeTag.js";
import {MeID} from "./users.js";
import {CanGetBasicPermissions, GetUserAccessLevel, HasAdminPermissions, IsUserCreatorOrMod} from "./users/$user.js";
import {PermissionGroupSet} from "./users/@User.js";

export enum HolderType {
	generic = "generic",
	truth = "truth",
	relevance = "relevance",
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
export const GetNodesByIDs = CreateAccessor(c=>(ids: string[]): MapNode[]=>{
	//return ids.map(id=>GetNode[emptyForLoading ? "BIN" : "normal"](id));
	return ids.map(id=>GetNode.BIN(id));
});
export const GetNodesByTitle = CreateAccessor(c=>(title: string, titleKey: TitleKey): MapNode[]=>{
	const nodeRevisions = GetNodeRevisionsByTitle(title, titleKey);
	return nodeRevisions.map(a=>GetNode.BIN(a.node));
});

export const GetNode = CreateAccessor(c=>(id: string|n)=>{
	return GetDoc({}, a=>a.nodes.get(id!));
});
/*export async function GetNodeAsync(id: string) {
	return await GetDataAsync("nodes", id) as MapNode;
}*/

export const IsRootNode = CreateAccessor(c=>(node: MapNode)=>{
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

export const GetParentNode = CreateAccessor(c=>(childPath: string|n)=>{
	return GetNode(GetParentNodeID(childPath));
});
export const GetParentNodeL2 = CreateAccessor(c=>(childPath: string|n)=>{
	return GetNodeL2(GetParentNodeID(childPath));
});
export const GetParentNodeL3 = CreateAccessor(c=>(childPath: string|n)=>{
	return GetNodeL3(GetParentPath(childPath));
});
export const GetNodeID = CreateAccessor(c=><{
	(path: string): string;
	(path: string|n): string|n;
}>((path: string|n)=>{
	if (path == null) return null;
	const ownNodeStr = CE(SplitStringBySlash_Cached(path)).LastOrX();
	Assert(ownNodeStr, `Invalid path:${path}`);
	return PathSegmentToNodeID(ownNodeStr);
}));

export const GetNodeParents = CreateAccessor(c=>(nodeID: string)=>{
	const parentLinks = GetNodeChildLinks(undefined, nodeID);
	return parentLinks.map(a=>c.MaybeCatchItemBail(()=>GetNode(a.parent)));
});
export const GetNodeParentsL2 = CreateAccessor(c=>(nodeID: string)=>{
	return GetNodeParents(nodeID).map(parent=>c.MaybeCatchItemBail(()=>(parent ? GetNodeL2(parent) : undefined)));
});
export const GetNodeParentsL3 = CreateAccessor(c=>(nodeID: string, path: string)=>{
	return GetNodeParents(nodeID).map(parent=>c.MaybeCatchItemBail(()=>(parent ? GetNodeL3(SlicePath(path, 1)) : undefined)));
});

export const GetNodeChildren = CreateAccessor(c=>(nodeID: string, includeMirrorChildren = true, tagsToIgnore?: string[])=>{
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
	let result = childLinks.map(link=>c.MaybeCatchItemBail(()=>GetNode(link.child) as MapNode)); // cast as MapNode, because db guarantees that node exists
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
export const GetNodeMirrorChildren = CreateAccessor(c=>(nodeID: string, tagsToIgnore?: string[])=>{
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

export const GetNodeChildrenL2 = CreateAccessor(c=>(nodeID: string, includeMirrorChildren = true, tagsToIgnore?: string[])=>{
	const nodeChildren = GetNodeChildren(nodeID, includeMirrorChildren, tagsToIgnore);
	const nodeChildrenL2 = nodeChildren.map(child=>c.MaybeCatchItemBail(()=>GetNodeL2.NN(child))); // nn: we know node exists, so rest should as well
	return nodeChildrenL2;
});
export const GetNodeChildrenL3 = CreateAccessor(c=>(nodeID: string, path?: string, includeMirrorChildren = true, tagsToIgnore?: string[])=>{
	path = path || nodeID;

	const nodeChildrenL2 = GetNodeChildrenL2(nodeID, includeMirrorChildren, tagsToIgnore);
	const nodeChildrenL3 = nodeChildrenL2.map(child=>c.MaybeCatchItemBail(()=>GetNodeL3.NN(`${path}/${child.id}`, tagsToIgnore))); // nn: we know node exists, so rest should as well
	return nodeChildrenL3;
});

export const GetPremiseOfSinglePremiseArgument = CreateAccessor(c=>(argumentNodeID: string)=>{
	const argument = GetNode.BIN(argumentNodeID);
	const children = GetNodeChildren(argumentNodeID, false);
	const childPremise = children.find(child=>child && IsPremiseOfSinglePremiseArgument(child, argument));
	return childPremise;
});

export function GetHolderType(childType: MapNodeType, parentType: MapNodeType|n) {
	if (parentType == MapNodeType.argument) {
		if (childType == MapNodeType.argument) return HolderType.relevance;
	} else if (parentType == MapNodeType.claim) {
		if (childType == MapNodeType.argument) return HolderType.truth;
	}
	return null;
}

export const ForLink_GetError = CreateAccessor(c=>(parentType: MapNodeType, childType: MapNodeType)=>{
	const parentTypeInfo = MapNodeType_Info.for[parentType].childTypes;
	if (!parentTypeInfo?.includes(childType)) return `The child's type (${MapNodeType[childType]}) is not valid for the parent's type (${MapNodeType[parentType]}).`;
});
export const ForNewLink_GetError = CreateAccessor(c=>(parentID: string, newChild: Pick<MapNode, "id" | "type">, permissions: PermissionGroupSet, newHolderType?: HolderType|n)=>{
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

export const ForDelete_GetError = CreateAccessor(c=>(userID: string|n, node: MapNodeL2, subcommandInfo?: {asPartOfMapDelete?: boolean, parentsToIgnore?: string[], childrenToIgnore?: string[]})=>{
	const baseText = `Cannot delete node #${node.id}, since `;
	if (!IsUserCreatorOrMod(userID, node)) return `${baseText}you are not the owner of this node. (or a mod)`;
	const parentLinks = GetNodeChildLinks(undefined, node.id);
	if (parentLinks.map(a=>a.parent).Except(...subcommandInfo?.parentsToIgnore ?? []).length > 1) return `${baseText}it has more than one parent. Try unlinking it instead.`;
	if (IsRootNode(node) && !subcommandInfo?.asPartOfMapDelete) return `${baseText}it's the root-node of a map.`;

	const nodeChildren = GetNodeChildrenL2(node.id);
	if (CE(nodeChildren).Any(a=>a == null)) return "[still loading children...]";
	if (CE(nodeChildren.map(a=>a.id)).Except(...(subcommandInfo?.childrenToIgnore ?? [])).length) {
		return `Cannot delete this node (#${node.id}) until all its children have been unlinked or deleted.`;
	}
	return null;
});

export const ForCut_GetError = CreateAccessor(c=>(userID: string|n, node: MapNodeL2)=>{
	const baseText = `Cannot unlink node #${node.id}, since `;
	if (!IsUserCreatorOrMod(userID, node)) return `${baseText}you are not its owner. (or a mod)`;
	//if (!asPartOfCut && (node.parents || {}).VKeys().length <= 1) return `${baseText}doing so would orphan it. Try deleting it instead.`;
	if (IsRootNode(node)) return `${baseText}it's the root-node of a map.`;
	//if (IsNodeSubnode(node)) return `${baseText}it's a subnode. Try deleting it instead.`;
	return null;
});

export const ForCopy_GetError = CreateAccessor(c=>(userID: string|n, node: MapNode)=>{
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