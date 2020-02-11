import { emptyArray, emptyArray_forLoading, IsNaN, CE, Assert } from "js-vextensions";
import { GetDoc, SlicePath, SplitStringBySlash_Cached, StoreAccessor } from "mobx-firelink";
import { GetNodeRevisionsByTitle } from "./nodeRevisions";
import { AsNodeL1, GetNodeL2, GetNodeL3, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument } from "./nodes/$node";
import { globalRootNodeID, MapNode, Polarity } from "./nodes/@MapNode";
import { MapNodeType, MapNodeType_Info } from "./nodes/@MapNodeType";
import { GetFinalTagCompsForTag, GetNodeTagComps, GetNodeTags } from "./nodeTags";
import { TagComp_MirrorChildrenFromXToY, TagComp_RestrictMirroringOfX, TagComp_XIsExtendedByY } from "./nodeTags/@MapNodeTag";
import { CanGetBasicPermissions, HasAdminPermissions, IsUserCreatorOrMod } from "./users/$user";
export var HolderType;
(function (HolderType) {
    HolderType[HolderType["Truth"] = 10] = "Truth";
    HolderType[HolderType["Relevance"] = 20] = "Relevance";
})(HolderType || (HolderType = {}));
export function PathSegmentToNodeID(segment) {
    if (segment.length == 22)
        return segment; // if raw UUID
    if (segment.length == 23)
        return segment.slice(1); // if UUID, but with marker at front (marking as subnode, I believe)
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
export const GetNodesByIDs = StoreAccessor(s => (ids, emptyForLoading = true) => {
    const nodes = ids.map(id => GetNode(id));
    if (emptyForLoading && CE(nodes).Any(a => a == null))
        return emptyArray_forLoading;
    return nodes;
});
export const GetNodesByTitle = StoreAccessor(s => (title, titleKey) => {
    let nodeRevisions = GetNodeRevisionsByTitle(title, titleKey);
    return nodeRevisions.map(a => GetNode(a.node));
});
export const GetNode = StoreAccessor(s => (id) => {
    // Assert(id != null && !IsNaN(id), "Node-id cannot be null or NaN.");
    if (id == null || IsNaN(id))
        return null;
    return GetDoc({}, a => a.nodes.get(id));
});
/* export async function GetNodeAsync(id: string) {
    return await GetDataAsync("nodes", id) as MapNode;
} */
export function GetParentCount(node) {
    return CE(node.parents || {}).VKeys().length;
}
export function GetChildCount(node) {
    return CE(node.children || {}).VKeys().length;
}
export function IsRootNode(node) {
    if (IsNodeSubnode(node))
        return false;
    return node.type == MapNodeType.Category && GetParentCount(node) == 0;
}
export function IsNodeSubnode(node) {
    return node.layerPlusAnchorParents != null;
}
export function GetParentPath(childPath) {
    const childPathNodes = SplitStringBySlash_Cached(childPath);
    if (childPathNodes.length == 1)
        return null;
    return childPathNodes.slice(0, -1).join("/");
}
export function GetParentNodeID(path) {
    const pathNodes = SplitStringBySlash_Cached(path);
    if (CE(pathNodes).Last()[0] == "*")
        return null;
    const parentNodeStr = CE(pathNodes).XFromLast(1);
    return parentNodeStr ? PathSegmentToNodeID(parentNodeStr) : null;
}
export const GetParentNode = StoreAccessor(s => (childPath) => {
    return GetNode(GetParentNodeID(childPath));
});
export const GetParentNodeL2 = StoreAccessor(s => (childPath) => {
    return GetNodeL2(GetParentNodeID(childPath));
});
export const GetParentNodeL3 = StoreAccessor(s => (childPath) => {
    return GetNodeL3(GetParentPath(childPath));
});
export const GetNodeID = StoreAccessor(s => (path) => {
    const ownNodeStr = CE(SplitStringBySlash_Cached(path)).LastOrX();
    return ownNodeStr ? PathSegmentToNodeID(ownNodeStr) : null;
});
export const GetNodeParents = StoreAccessor(s => (nodeID) => {
    let node = GetNode(nodeID);
    return CE(node.parents || {}).VKeys().map(id => GetNode(id));
});
export const GetNodeParentsL2 = StoreAccessor(s => (nodeID) => {
    return GetNodeParents(nodeID).map(parent => (parent ? GetNodeL2(parent) : null));
});
export const GetNodeParentsL3 = StoreAccessor(s => (nodeID, path) => {
    return GetNodeParents(nodeID).map(parent => (parent ? GetNodeL3(SlicePath(path, 1)) : null));
});
export const GetNodeChildren = StoreAccessor(s => (nodeID, includeMirrorChildren = true, tagsToIgnore) => {
    let node = GetNode(nodeID);
    if (node == null)
        return emptyArray;
    // special case, for demo map
    if (node.children && node.children[0] instanceof MapNode) {
        return node.children;
    }
    let result = CE(node.children || {}).VKeys().map(id => GetNode(id));
    if (includeMirrorChildren) {
        //let tags = GetNodeTags(nodeID);
        let tagComps = GetNodeTagComps(nodeID, tagsToIgnore);
        // maybe todo: have disable-direct-children merely stop you from adding new direct children, not hide existing ones
        if (CE(tagComps).Any(a => a instanceof TagComp_MirrorChildrenFromXToY && a.nodeY == nodeID && a.disableDirectChildren)) {
            result = [];
        }
        let mirrorChildren = GetNodeMirrorChildren(nodeID, tagsToIgnore);
        // filter out duplicate children
        mirrorChildren = mirrorChildren.filter(mirrorChild => !CE(result).Any(directChild => directChild._key == mirrorChild._key));
        result.push(...mirrorChildren);
    }
    return result;
});
export const GetNodeMirrorChildren = StoreAccessor(s => (nodeID, tagsToIgnore) => {
    let tags = GetNodeTags(nodeID).filter(tag => { var _a; return tag && !((_a = tagsToIgnore) === null || _a === void 0 ? void 0 : _a.includes(tag._key)); });
    //let tagComps = GetNodeTagComps(nodeID, true, tagsToIgnore);
    let result = [];
    for (const tag of tags) {
        const tagComps = GetFinalTagCompsForTag(tag);
        for (const tagComp of tagComps) {
            if (tagComp instanceof TagComp_MirrorChildrenFromXToY && tagComp.nodeY == nodeID) {
                //let comp = tag.mirrorChildrenFromXToY;
                let mirrorChildrenL3 = GetNodeChildrenL3(tagComp.nodeX, undefined, undefined, ((tagsToIgnore !== null && tagsToIgnore !== void 0 ? tagsToIgnore : [])).concat(tag._key));
                mirrorChildrenL3 = mirrorChildrenL3.filter(child => {
                    if (child == null)
                        return false;
                    let childTagComps = GetNodeTagComps(child._key, true, ((tagsToIgnore !== null && tagsToIgnore !== void 0 ? tagsToIgnore : [])).concat(tag._key));
                    if (childTagComps == emptyArray_forLoading)
                        return false; // don't include child until we're sure it's allowed to be mirrored
                    const mirroringBlacklisted = CE(childTagComps).Any(comp => {
                        var _a;
                        if (!(comp instanceof TagComp_RestrictMirroringOfX))
                            return false;
                        return comp.blacklistAllMirrorParents || ((_a = comp.blacklistedMirrorParents) === null || _a === void 0 ? void 0 : _a.includes(nodeID));
                    });
                    if (mirroringBlacklisted)
                        return false;
                    return (child.link.polarity == Polarity.Supporting && tagComp.mirrorSupporting) || (child.link.polarity == Polarity.Opposing && tagComp.mirrorOpposing);
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
                let mirrorChildrenL1 = mirrorChildrenL3.map(childL3 => AsNodeL1(childL3));
                result.push(...mirrorChildrenL1);
            }
        }
    }
    // exclude any mirror-child which is an extension of (ie. wider/weaker than) another child (that is, if it's the Y of an "X is extended by Y" tag, between children) 
    result = result.filter(child => {
        let childTagComps = GetNodeTagComps(child._key, true, tagsToIgnore);
        const extensionOfAnotherMirrorChild = CE(childTagComps).Any(comp => {
            if (!(comp instanceof TagComp_XIsExtendedByY))
                return false;
            let childIsNodeY = comp.nodeY == child._key;
            if (!childIsNodeY)
                return false;
            let nodeDirectChildren = GetNodeChildren(nodeID, false);
            let otherChildIsNodeX = CE(nodeDirectChildren.concat(result)).Any(otherChild => comp.nodeX == otherChild._key);
            return otherChildIsNodeX;
        });
        if (extensionOfAnotherMirrorChild)
            return false;
        if (IsSinglePremiseArgument(child)) {
            let childPremise = GetPremiseOfSinglePremiseArgument(child._key);
            if (childPremise) {
                let childPremiseTagComps = GetNodeTagComps(childPremise._key, true, tagsToIgnore);
                const premiseIsExtensionOfAnotherMirrorChildPremise = CE(childPremiseTagComps).Any(comp => {
                    if (!(comp instanceof TagComp_XIsExtendedByY))
                        return false;
                    let childPremiseIsNodeY = comp.nodeY == childPremise._key;
                    if (!childPremiseIsNodeY)
                        return false;
                    let nodeDirectChildren = GetNodeChildren(nodeID, false);
                    let otherChildPremiseIsNodeX = CE(nodeDirectChildren.concat(result)).Any(otherChild => {
                        var _a;
                        return IsSinglePremiseArgument(otherChild) && comp.nodeX == ((_a = GetPremiseOfSinglePremiseArgument(otherChild._key)) === null || _a === void 0 ? void 0 : _a._key);
                    });
                    return otherChildPremiseIsNodeX;
                });
                if (premiseIsExtensionOfAnotherMirrorChildPremise)
                    return false;
            }
        }
        return true;
    });
    // filter out duplicate children
    result = result.filter((node, index) => {
        let earlierNodes = result.slice(0, index);
        return !CE(earlierNodes).Any(a => a._key == node._key);
    });
    return result;
});
export const GetNodeChildrenL2 = StoreAccessor(s => (nodeID, includeMirrorChildren = true, tagsToIgnore) => {
    const nodeChildren = GetNodeChildren(nodeID, includeMirrorChildren, tagsToIgnore);
    return nodeChildren.map(child => (child ? GetNodeL2(child) : null));
});
export const GetNodeChildrenL3 = StoreAccessor(s => (nodeID, path, includeMirrorChildren = true, tagsToIgnore) => {
    path = path || nodeID;
    const nodeChildrenL2 = GetNodeChildrenL2(nodeID, includeMirrorChildren, tagsToIgnore);
    return nodeChildrenL2.map(child => (child ? GetNodeL3(`${path}/${child._key}`, tagsToIgnore) : null));
});
export const GetPremiseOfSinglePremiseArgument = StoreAccessor(s => (argumentNodeID) => {
    let argument = GetNode(argumentNodeID);
    let children = GetNodeChildren(argumentNodeID, false);
    let childPremise = children.find(child => child && IsPremiseOfSinglePremiseArgument(child, argument));
    return childPremise;
});
export function GetHolderType(childType, parentType) {
    if (parentType == MapNodeType.Argument) {
        if (childType == MapNodeType.Argument)
            return HolderType.Relevance;
    }
    else if (parentType == MapNodeType.Claim) {
        if (childType == MapNodeType.Argument)
            return HolderType.Truth;
    }
    return null;
}
export const ForLink_GetError = StoreAccessor(s => (parentType, childType) => {
    var _a;
    const parentTypeInfo = MapNodeType_Info.for[parentType].childTypes;
    if (!((_a = parentTypeInfo) === null || _a === void 0 ? void 0 : _a.includes(childType)))
        return `The child's type (${MapNodeType[childType]}) is not valid for the parent's type (${MapNodeType[parentType]}).`;
});
export const ForNewLink_GetError = StoreAccessor(s => (parentID, newChild, permissions, newHolderType) => {
    if (!CanGetBasicPermissions(permissions))
        return "You're not signed in, or lack basic permissions.";
    const parent = GetNode(parentID);
    if (parent == null)
        return "Parent data not found.";
    // const parentPathIDs = SplitStringBySlash_Cached(parentPath).map(a => a.ToInt());
    // if (map.name == "Global" && parentPathIDs.length == 1) return false; // if parent is l1(root), don't accept new children
    if (parent._key == globalRootNodeID && !HasAdminPermissions(permissions))
        return "Only admins can add children to the global-root.";
    // if in global map, parent is l2, and user is not a mod (and not node creator), don't accept new children
    // if (parentPathIDs[0] == globalRootNodeID && parentPathIDs.length == 2 && !HasModPermissions(permissions) && parent.creator != MeID()) return false;
    if (parent._key == newChild._key)
        return "Cannot link node as its own child.";
    const isAlreadyChild = CE(parent.children || {}).VKeys().includes(`${newChild._key}`);
    // if new-holder-type is not specified, consider "any" and so don't check
    if (newHolderType !== undefined) {
        const currentHolderType = GetHolderType(newChild.type, parent.type);
        if (isAlreadyChild && currentHolderType == newHolderType)
            return false; // if already a child of this parent, reject (unless it's a claim, in which case allow, as can be)
    }
    return ForLink_GetError(parent.type, newChild.type);
});
export const ForDelete_GetError = StoreAccessor(s => (userID, node, subcommandInfo) => {
    var _a, _b, _c, _d, _e;
    const baseText = `Cannot delete node #${node._key}, since `;
    if (!IsUserCreatorOrMod(userID, node))
        return `${baseText}you are not the owner of this node. (or a mod)`;
    if (CE(CE(node.parents || {}).VKeys()).Except(...(_b = (_a = subcommandInfo) === null || _a === void 0 ? void 0 : _a.parentsToIgnore, (_b !== null && _b !== void 0 ? _b : []))).length > 1)
        return `${baseText}it has more than one parent. Try unlinking it instead.`;
    if (IsRootNode(node) && !((_c = subcommandInfo) === null || _c === void 0 ? void 0 : _c.asPartOfMapDelete))
        return `${baseText}it's the root-node of a map.`;
    const nodeChildren = GetNodeChildrenL2(node._key);
    if (CE(nodeChildren).Any(a => a == null))
        return "[still loading children...]";
    if (CE(nodeChildren.map(a => a._key)).Except(...(_e = (_d = subcommandInfo) === null || _d === void 0 ? void 0 : _d.childrenToIgnore, (_e !== null && _e !== void 0 ? _e : []))).length) {
        return `Cannot delete this node (#${node._key}) until all its children have been unlinked or deleted.`;
    }
    return null;
});
export const ForCut_GetError = StoreAccessor(s => (userID, node) => {
    const baseText = `Cannot unlink node #${node._key}, since `;
    if (!IsUserCreatorOrMod(userID, node))
        return `${baseText}you are not its owner. (or a mod)`;
    //if (!asPartOfCut && (node.parents || {}).VKeys().length <= 1) return `${baseText}doing so would orphan it. Try deleting it instead.`;
    if (IsRootNode(node))
        return `${baseText}it's the root-node of a map.`;
    if (IsNodeSubnode(node))
        return `${baseText}it's a subnode. Try deleting it instead.`;
    return null;
});
export const ForCopy_GetError = StoreAccessor(s => (userID, node) => {
    if (!CanGetBasicPermissions(userID))
        return "You're not signed in, or lack basic permissions.";
    if (IsRootNode(node))
        return "Cannot copy the root-node of a map.";
    if (IsNodeSubnode(node))
        return "Cannot copy a subnode.";
    return null;
});
/* export function GetUnlinkErrorMessage(parent: MapNode, child: MapNode) {
    //let childNodes = node.children.Select(a=>nodes[a]);
    let parentNodes = nodes.filter(a=>a.children && a.children[node._id]);
    if (parentNodes.length <= 1)
} */ 
