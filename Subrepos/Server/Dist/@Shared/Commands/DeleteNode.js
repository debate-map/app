var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DeleteNode_1;
import { AddSchema, AssertV, AssertValidate, Command, MergeDBUpdates } from "mobx-firelink";
import { MapEdit, UserEdit } from "../CommandMacros";
import { GetNodeL2 } from "../Store/firebase/nodes/$node";
import { GetNodeRevisions } from "../Store/firebase/nodeRevisions";
import { GetNode, ForDelete_GetError } from "../Store/firebase/nodes";
import { GetMaps } from "../Store/firebase/maps";
import { CE } from "js-vextensions";
AddSchema("DeleteNode_payload", {
    properties: {
        mapID: { type: "string" },
        nodeID: { type: "string" },
        withContainerArgument: { type: "string" },
    },
    required: ["nodeID"],
});
let DeleteNode = DeleteNode_1 = class DeleteNode extends Command {
    constructor() {
        super(...arguments);
        // as subcommand
        this.asPartOfMapDelete = false;
        this.parentsToIgnore = [];
        this.childrenToIgnore = [];
    }
    Validate() {
        var _a, _b;
        AssertValidate("DeleteNode_payload", this.payload, "Payload invalid");
        const { mapID, nodeID, withContainerArgument } = this.payload;
        const { asPartOfMapDelete, parentsToIgnore, childrenToIgnore } = this;
        this.oldData = GetNodeL2(nodeID);
        AssertV(this.oldData, "oldData is null.");
        // this.oldRevisions = await GetAsync(() => GetNodeRevisions(nodeID));
        // this.oldRevisions = await Promise.all(...oldRevisionIDs.map(id => GetDataAsync('nodeRevisions', id)));
        // this.oldRevisions = await Promise.all(...oldRevisionIDs.map(id => GetAsync(() => GetNodeRevision(id))));
        /* const oldRevisionIDs = await GetNodeRevisionIDsForNode_OneTime(nodeID);
        this.oldRevisions = await GetAsync(() => oldRevisionIDs.map(id => GetNodeRevision(id))); */
        this.oldRevisions = GetNodeRevisions(nodeID);
        AssertV(this.oldRevisions.every(a => a != null) && this.oldRevisions.length, "oldRevisions has null entries, or length of zero.");
        const parentIDs = CE(this.oldData.parents || {}).VKeys();
        this.oldParentChildrenOrders = parentIDs.map(parentID => { var _a; return (_a = GetNode(parentID)) === null || _a === void 0 ? void 0 : _a.childrenOrder; });
        // AssertV(this.oldParentChildrenOrders.All((a) => a != null), 'oldParentChildrenOrders has null entries.');
        // this.viewerIDs_main = await GetAsync(() => GetNodeViewers(nodeID));
        const maps = GetMaps();
        this.mapIDs = (_a = maps) === null || _a === void 0 ? void 0 : _a.map(a => { var _a; return (_a = a) === null || _a === void 0 ? void 0 : _a._key; });
        AssertV(this.mapIDs && this.mapIDs.every(a => a != null), "mapIDs is null, or has null entries.");
        // probably todo: integrate this into the command Validate functions themselves
        /* Assert((this.oldData.parents || {}).VKeys().length <= 1, "Cannot delete this child, as it has more than one parent. Try unlinking it instead.");
        let normalChildCount = (this.oldData.children || {}).VKeys().length;
        Assert(normalChildCount == 0, "Cannot delete this node until all its (non-impact-premise) children have been unlinked or deleted."); */
        const earlyError = ForDelete_GetError(this.userInfo.id, this.oldData, this.parentCommand && { asPartOfMapDelete, parentsToIgnore, childrenToIgnore });
        AssertV(earlyError == null, earlyError);
        if (withContainerArgument) {
            this.sub_deleteContainerArgument = (_b = this.sub_deleteContainerArgument, (_b !== null && _b !== void 0 ? _b : new DeleteNode_1({ mapID, nodeID: withContainerArgument }).MarkAsSubcommand(this)));
            this.sub_deleteContainerArgument.childrenToIgnore = [nodeID];
            // this.sub_deleteContainerArgument.Validate_Early();
            this.sub_deleteContainerArgument.Validate();
        }
    }
    GetDBUpdates() {
        const { nodeID } = this.payload;
        let updates = {};
        // delete node's own data
        updates[`nodes/${nodeID}`] = null;
        // updates[`nodeExtras/${nodeID}`] = null;
        updates[`nodeRatings/${nodeID}`] = null;
        updates[`nodeViewers/${nodeID}`] = null;
        /* for (const viewerID of this.viewerIDs_main) {
            updates[`userViewedNodes/${viewerID}/.${nodeID}}`] = null;
        } */
        // delete links with parents
        for (const { index, key: parentID } of CE(this.oldData.parents || {}).Pairs()) {
            updates[`nodes/${parentID}/.children/.${nodeID}`] = null;
            // let parent_childrenOrder = this.oldParentID__childrenOrder[parentID];
            const parent_childrenOrder = this.oldParentChildrenOrders[index];
            if (parent_childrenOrder) {
                updates[`nodes/${parentID}/.childrenOrder`] = CE(CE(parent_childrenOrder).Except(nodeID)).IfEmptyThen(null);
            }
        }
        // delete placement in layer
        if (this.oldData.layerPlusAnchorParents) {
            for (const layerPlusAnchorStr of CE(this.oldData.layerPlusAnchorParents).VKeys()) {
                const [layerID, anchorNodeID] = layerPlusAnchorStr.split("+");
                updates[`layers/${layerID}/.nodeSubnodes/.${anchorNodeID}/.${nodeID}`] = null;
            }
        }
        // delete revisions
        for (const revision of this.oldRevisions) {
            updates[`nodeRevisions/${revision._key}`] = null;
        }
        // delete edit-time entry within each map (if it exists)
        for (const mapID of this.mapIDs) {
            updates[`mapNodeEditTimes/${mapID}/.${nodeID}`] = null;
        }
        if (this.sub_deleteContainerArgument) {
            updates = MergeDBUpdates(updates, this.sub_deleteContainerArgument.GetDBUpdates());
        }
        // todo: we also need to delete ourselves from our children's "parents" prop! (for when you can delete nodes with children)
        return updates;
    }
};
DeleteNode = DeleteNode_1 = __decorate([
    MapEdit,
    UserEdit
], DeleteNode);
export { DeleteNode };
