import {Assert, CE, emptyArray_forLoading, IsString} from "js-vextensions";
import {CreateAccessor, GetDoc, MapWithBailHandling, SplitStringBySlash_Cached, UUID} from "mobx-graphlink";
import {GetNodeLinks} from "./nodeLinks.js";
import {AsNodeL1, GetNodeL2, GetNodeL3} from "./nodes/$node.js";
import {NodeL1, NodeL2} from "./nodes/@Node.js";
import {NodeType} from "./nodes/@NodeType.js";
import {GetFinalTagCompsForTag, GetNodeTagComps, GetNodeTags} from "./nodeTags.js";
import {TagComp_MirrorChildrenFromXToY, TagComp_RestrictMirroringOfX, TagComp_XIsExtendedByY} from "./nodeTags/@NodeTag.js";
import {CanGetBasicPermissions, IsUserCreatorOrMod} from "./users/$user.js";
import {ChildGroup, Polarity} from "./nodeLinks/@NodeLink.js";
import {PERMISSIONS} from "../DB.js";

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

export const GetNodesByIDs = CreateAccessor((ids: string[]): NodeL1[]=>{
	//return ids.map(id=>GetNode[emptyForLoading ? "BIN" : "Normal"](id));
	return ids.map(id=>GetNode.BIN(id));
});
/*export const GetNodesByTitle = CreateAccessor((title: string, titleKey: TitleKey): NodeL1[]=>{
	const nodeRevisions = GetNodeRevisionsByTitle(title, titleKey);
	return nodeRevisions.map(a=>GetNode.BIN(a.node));
});*/

export const GetNode = CreateAccessor((id: string|n)=>{
	return GetDoc({}, a=>a.nodes.get(id!));
});

// sync:rs
export const IsRootNode = CreateAccessor((node: NodeL1)=>{
	if (node.type != NodeType.category) return false;
	const parents = GetNodeLinks(undefined, node.id);
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
	const parentLinks = GetNodeLinks(undefined, nodeID);
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
	if (node.children && node.children[0] instanceof NodeL1) {
		return node.children as any;
	}*/

	const childLinks = GetNodeLinks(nodeID);
	/*let result = childLinks.map(link=>{
		if (c.catchItemBails) return GetNode.CatchBail(c.catchItemBails_asX, link.child);
		return GetNode(link.child);
	});*/
	let result = MapWithBailHandling(childLinks, link=>GetNode.BIN(link.child)); // BIN: we know link exists, so child-node should as well (so null must mean change loading)
	//let result = MapWithBailHandling(childLinks, link=>GetNode(link.child) as NodeL1);
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

	let result = [] as NodeL1[];
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
							newChild = Clone(child).VSet({_key: child.id}) as NodeL3;
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

		/*if (IsSinglePremiseArgument(child)) {
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
		}*/

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

export function GetChildGroup(childType: NodeType, parentType: NodeType|n) {
	if (parentType == NodeType.argument) {
		if (childType == NodeType.argument) return ChildGroup.relevance;
	} else if (parentType == NodeType.claim) {
		if (childType == NodeType.argument) return ChildGroup.truth;
	}
	return ChildGroup.generic;
}

// sync:rs[assert_user_can_delete_node]
export const CheckUserCanDeleteNode = CreateAccessor((userID: string|n, node: NodeL2, subcommandInfo?: {asPartOfMapDelete?: boolean, parentsToIgnore?: string[], childrenToIgnore?: string[], forRecursiveCommentsDelete? : boolean})=>{
	const skipPermCheck = (node.type == NodeType.comment) && subcommandInfo?.forRecursiveCommentsDelete;
	const baseText = `Cannot delete node #${node.id}, since `;
	if (!skipPermCheck) {
	    if (!PERMISSIONS.Node.Delete(userID, node)) return `${baseText}you are not the owner of this node. (or a mod)`;
	}

	const parentLinks = GetNodeLinks(undefined, node.id);
	if (parentLinks.map(a=>a.parent).Exclude(...subcommandInfo?.parentsToIgnore ?? []).length > 1) return `${baseText}it has more than one parent. Try unlinking it instead.`;
	if (IsRootNode(node) && !subcommandInfo?.asPartOfMapDelete) return `${baseText}it's the root-node of a map.`;

	/*const nodeChildren = GetNodeChildrenL2(node.id, false);
	if (CE(nodeChildren).Any(a=>a == null)) return "[still loading children...]";
	if (CE(nodeChildren.map(a=>a.id)).Exclude(...(subcommandInfo?.childrenToIgnore ?? [])).length) {*/
	const childLinks = GetNodeLinks(node.id);
	if (CE(childLinks.map(a=>a.child)).Exclude(...(subcommandInfo?.childrenToIgnore ?? [])).length) {
		return `Cannot delete this node (#${node.id}) until all its children have been unlinked or deleted.`;
	}
	return null;
});

export const ForCut_GetError = CreateAccessor((userID: string|n, node: NodeL2)=>{
	const baseText = `Cannot unlink node #${node.id}, since `;
	if (!PERMISSIONS.Node.Modify(userID, node)) return `${baseText}you are not its owner. (or a mod)`;
	//if (!asPartOfCut && (node.parents || {}).VKeys().length <= 1) return `${baseText}doing so would orphan it. Try deleting it instead.`;
	if (IsRootNode(node)) return `${baseText}it's the root-node of a map.`;
	//if (IsNodeSubnode(node)) return `${baseText}it's a subnode. Try deleting it instead.`;
	return null;
});

export const ForCopy_GetError = CreateAccessor((userID: string|n, node: NodeL1)=>{
	if (!CanGetBasicPermissions(userID)) return "You're not signed in, or lack basic permissions.";
	if (IsRootNode(node)) return "Cannot copy the root-node of a map.";
	//if (IsNodeSubnode(node)) return "Cannot copy a subnode.";
	return null;
});

/*export function GetUnlinkErrorMessage(parent: NodeL1, child: NodeL1) {
	//let childNodes = node.children.Select(a=>nodes[a]);
	let parentNodes = nodes.filter(a=>a.children && a.children[node._id]);
	if (parentNodes.length <= 1)
}*/