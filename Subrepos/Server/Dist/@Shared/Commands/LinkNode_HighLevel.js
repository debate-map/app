import { E, OmitIfFalsy, CE, ObjectCE } from "js-vextensions";
import { AssertV, Command, MergeDBUpdates, AV } from "mobx-firelink";
import { AddChildNode } from "./AddChildNode";
import { DeleteNode } from "./DeleteNode";
import { LinkNode } from "./LinkNode";
import { UnlinkNode } from "./UnlinkNode";
import { ClaimForm, Polarity, MapNode } from "../Store/firebase/nodes/@MapNode";
import { GetNodeL3, GetNodeL2, IsPremiseOfMultiPremiseArgument, IsSinglePremiseArgument } from "../Store/firebase/nodes/$node";
import { GetParentNodeL3, GetHolderType, GetParentNodeID, GetNode } from "../Store/firebase/nodes";
import { MapNodeType } from "../Store/firebase/nodes/@MapNodeType";
import { GetMap } from "../Store/firebase/maps";
import { CanContributeToNode } from "../Store/firebase/users/$user";
import { MeID } from "../Store/firebase/users";
import { MapNodeRevision } from "../Store/firebase/nodes/@MapNodeRevision";
import { SearchUpFromNodeForNodeMatchingX } from "../Utils/Store/PathFinder";
export function CreateLinkCommand(mapID, draggedNodePath, dropOnNodePath, polarity, asCopy) {
    const draggedNode = GetNodeL3(draggedNodePath);
    const dropOnNode = GetNodeL3(dropOnNodePath);
    // const draggedNode_parent = GetParentNodeL3(draggedNodePath);
    const dropOnNode_parent = GetParentNodeL3(dropOnNodePath);
    const holderType = GetHolderType(dropOnNode.type, dropOnNode_parent ? dropOnNode_parent.type : null);
    const formForClaimChildren = dropOnNode.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base;
    return new LinkNode_HighLevel({
        mapID, oldParentID: GetParentNodeID(draggedNodePath), newParentID: dropOnNode._key, nodeID: draggedNode._key,
        newForm: draggedNode.type == MapNodeType.Claim ? formForClaimChildren : null,
        newPolarity: polarity,
        allowCreateWrapperArg: holderType != null || !dropOnNode.multiPremiseArgument,
        unlinkFromOldParent: !asCopy, deleteEmptyArgumentWrapper: true,
    });
}
export class LinkNode_HighLevel extends Command {
    Validate() {
        var _a, _b, _c, _d;
        let { mapID, oldParentID, newParentID, nodeID, newForm, allowCreateWrapperArg, unlinkFromOldParent, deleteEmptyArgumentWrapper, newPolarity } = this.payload;
        AssertV(oldParentID !== nodeID, "Old parent-id and child-id cannot be the same!");
        AssertV(newParentID !== nodeID, "New parent-id and child-id cannot be the same!");
        //AssertV(oldParentID !== newParentID, "Old-parent-id and new-parent-id cannot be the same!");
        this.returnData = {};
        this.map_data = AV.NonNull = GetMap(mapID);
        this.node_data = AV.NonNull = GetNodeL2(nodeID);
        const oldParent_data = GetNodeL2(oldParentID);
        //AssertV(oldParent_data, "oldParent_data is null."); // commented: allow linking orphaned nodes
        this.newParent_data = AV.NonNull = GetNodeL2(newParentID);
        let pastingPremiseAsRelevanceArg = IsPremiseOfMultiPremiseArgument(this.node_data, oldParent_data) && allowCreateWrapperArg;
        AssertV(oldParentID !== newParentID || pastingPremiseAsRelevanceArg, "Old-parent-id and new-parent-id cannot be the same! (unless changing between truth-arg and relevance-arg)");
        AssertV(CanContributeToNode(MeID(), newParentID), "Cannot paste under a node with contributions disabled.");
        // if (command.payload.unlinkFromOldParent && node.parents.VKeys().length == 1 && newParentPath.startsWith(draggedNodePath)) {
        /* if (unlinkFromOldParent && newParentPath.startsWith(draggedNodePath)) {
            return "Cannot move a node to a path underneath itself. (the move could orphan it and its descendants, if the new-parent's only anchoring was through the dragged-node)";
        } */
        if (unlinkFromOldParent) {
            const closestMapRootNode = this.newParent_data.rootNodeForMap ? newParentID : SearchUpFromNodeForNodeMatchingX(newParentID, id => { var _a; return ((_a = GetNode(id)) === null || _a === void 0 ? void 0 : _a.rootNodeForMap) != null; }, [nodeID]);
            AssertV(closestMapRootNode != null, "Cannot move a node to a path that would orphan it.");
        }
        let newParentID_forClaim = newParentID;
        const canCreateWrapperArg = this.node_data.type === MapNodeType.Claim && ObjectCE(this.newParent_data.type).IsOneOf(MapNodeType.Claim, MapNodeType.Argument);
        if (canCreateWrapperArg) {
            const createWrapperArg = canCreateWrapperArg && allowCreateWrapperArg;
            if (createWrapperArg) {
                // Assert(newPolarity, 'Since this command has to create a wrapper-argument, you must supply the newPolarity property.');
                newPolarity = newPolarity || Polarity.Supporting; // if new-polarity isn't supplied, just default to Supporting (this can happen if a claim is copied from search-results)
                const argumentWrapper = new MapNode({ type: MapNodeType.Argument, ownerMapID: OmitIfFalsy(this.newParent_data.ownerMapID) });
                const argumentWrapperRevision = new MapNodeRevision(this.map_data.nodeDefaults);
                this.sub_addArgumentWrapper = (_a = this.sub_addArgumentWrapper, (_a !== null && _a !== void 0 ? _a : new AddChildNode({
                    mapID, parentID: newParentID, node: argumentWrapper, revision: argumentWrapperRevision,
                    // link: E({ _: true }, newPolarity && { polarity: newPolarity }) as any,
                    link: E({ _: true, polarity: newPolarity }),
                }).MarkAsSubcommand(this)));
                this.sub_addArgumentWrapper.Validate();
                this.returnData.argumentWrapperID = this.sub_addArgumentWrapper.sub_addNode.nodeID;
                newParentID_forClaim = this.sub_addArgumentWrapper.sub_addNode.nodeID;
            }
            else {
                const mustCreateWrapperArg = canCreateWrapperArg && !this.newParent_data.multiPremiseArgument;
                AssertV(mustCreateWrapperArg === false, `Linking node #${nodeID} under #${newParentID} requires creating a wrapper-arg, but this was disallowed by passed prop.`);
            }
        }
        this.sub_linkToNewParent = (_b = this.sub_linkToNewParent, (_b !== null && _b !== void 0 ? _b : new LinkNode({ mapID, parentID: newParentID_forClaim, childID: nodeID, childForm: newForm, childPolarity: newPolarity }).MarkAsSubcommand(this)));
        this.sub_linkToNewParent.Validate();
        if (unlinkFromOldParent) {
            this.sub_unlinkFromOldParent = (_c = this.sub_unlinkFromOldParent, (_c !== null && _c !== void 0 ? _c : new UnlinkNode({ mapID, parentID: oldParentID, childID: nodeID }).MarkAsSubcommand(this)));
            this.sub_unlinkFromOldParent.allowOrphaning = true; // allow "orphaning" of nodeID, since we're going to reparent it simultaneously -- using the sub_linkToNewParent subcommand
            this.sub_unlinkFromOldParent.Validate();
            // if the old parent was a single-premise argument, and the moved node was its only child, also delete the old parent
            if (deleteEmptyArgumentWrapper && IsSinglePremiseArgument(oldParent_data) && CE(oldParent_data.children).VKeys().length === 1) {
                this.sub_deleteOldParent = (_d = this.sub_deleteOldParent, (_d !== null && _d !== void 0 ? _d : new DeleteNode({ mapID, nodeID: oldParentID }).MarkAsSubcommand(this)));
                this.sub_deleteOldParent.childrenToIgnore = [nodeID]; // let DeleteNode sub that it doesn't need to wait for nodeID to be deleted (since we're moving it out from old-parent simultaneously with old-parent's deletion)
                this.sub_deleteOldParent.Validate();
            }
        }
    }
    GetDBUpdates() {
        let updates = {};
        if (this.sub_unlinkFromOldParent)
            updates = MergeDBUpdates(updates, this.sub_unlinkFromOldParent.GetDBUpdates());
        if (this.sub_deleteOldParent)
            updates = MergeDBUpdates(updates, this.sub_deleteOldParent.GetDBUpdates());
        if (this.sub_addArgumentWrapper)
            updates = MergeDBUpdates(updates, this.sub_addArgumentWrapper.GetDBUpdates());
        updates = MergeDBUpdates(updates, this.sub_linkToNewParent.GetDBUpdates());
        return updates;
    }
}
LinkNode_HighLevel.defaultPayload = { allowCreateWrapperArg: true };
