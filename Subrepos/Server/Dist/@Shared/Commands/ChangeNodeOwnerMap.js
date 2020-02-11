var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ChangeNodeOwnerMap_1;
import { Command, AssertV, MergeDBUpdates, AV } from "mobx-firelink";
import { AddSchema, AssertValidate } from "mobx-firelink";
import { E, DEL, IsSpecialEmptyArray, CE } from "js-vextensions";
import { UserEdit } from "../CommandMacros";
import { GetNode, GetNodesByIDs, GetNodeChildren } from "../Store/firebase/nodes";
import { IsUserCreatorOrMod } from "../Store/firebase/users/$user";
import { GetMap } from "../Store/firebase/maps";
import { MapType } from "../Store/firebase/maps/@Map";
import { GetNodeRevision } from "../Store/firebase/nodeRevisions";
import { PermissionInfoType } from "../Store/firebase/nodes/@MapNodeRevision";
AddSchema("ChangeNodeOwnerMap_payload", {
    properties: {
        nodeID: { type: "string" },
        newOwnerMapID: { type: ["null", "string"] },
        argumentNodeID: { type: "string" },
    },
    required: ["nodeID", "newOwnerMapID"],
});
// todo: integrate rest of validation code, preferably using system callable from both here and the ui (this is needed for many other commands as well)
// @MapEdit
let ChangeNodeOwnerMap = ChangeNodeOwnerMap_1 = class ChangeNodeOwnerMap extends Command {
    Validate() {
        var _a, _b, _c;
        AssertValidate("ChangeNodeOwnerMap_payload", this.payload, "Payload invalid");
        const { nodeID, newOwnerMapID, argumentNodeID } = this.payload;
        const oldData = AV.NonNull = GetNode(nodeID);
        AssertV(IsUserCreatorOrMod(this.userInfo.id, oldData), "User is not the node's creator, or a moderator.");
        // if making private
        if (oldData.ownerMapID == null) {
            const newOwnerMap = GetMap(newOwnerMapID);
            AssertV(newOwnerMapID, "newOwnerMap still loading.");
            AssertV(newOwnerMap.type == MapType.Private, "Node must be in private map to be made private.");
            const permittedPublicParentIDs = argumentNodeID ? [argumentNodeID] : [];
            const parents = GetNodesByIDs(CE((_a = oldData.parents, (_a !== null && _a !== void 0 ? _a : {}))).VKeys());
            const parentsArePrivateInSameMap = !IsSpecialEmptyArray(parents) && newOwnerMapID && parents.every(a => a.ownerMapID == newOwnerMapID || permittedPublicParentIDs.includes(a._key));
            AssertV(parentsArePrivateInSameMap, "To make node private, all its parents must be private nodes within the same map. (to ensure we don't leave links in other maps, which would make the owner-map-id invalid)");
        }
        else {
            // if making public
            AssertV(oldData.rootNodeForMap == null, "Cannot make a map's root-node public.");
            // the owner map must allow public nodes (at some point, may remove this restriction, by having action cause node to be auto-replaced with in-map private-copy)
            // AssertV(oldData.parents?.VKeys().length > 0, "Cannot make an")
            const revision = GetNodeRevision(oldData.currentRevision);
            AssertV(revision, "revision not yet loaded.");
            AssertV(((_b = revision.permission_contribute) === null || _b === void 0 ? void 0 : _b.type) == PermissionInfoType.Anyone, 'To make node public, the "Contribute" permission must be set to "Anyone".');
            const permittedPrivateChildrenIDs = this.parentCommand instanceof ChangeNodeOwnerMap_1 ? [this.parentCommand.payload.nodeID] : [];
            const children = GetNodeChildren(oldData._key);
            AssertV(!IsSpecialEmptyArray(children), "children still loading.");
            AssertV(children.every(a => a.ownerMapID == null || permittedPrivateChildrenIDs.includes(a._key)), "To make node public, it must not have any private children.");
        }
        this.newData = E(oldData, { ownerMapID: (newOwnerMapID !== null && newOwnerMapID !== void 0 ? newOwnerMapID : DEL) });
        AssertValidate("MapNode", this.newData, "New node-data invalid");
        if (argumentNodeID) {
            this.sub_changeOwnerMapForArgument = (_c = this.sub_changeOwnerMapForArgument, (_c !== null && _c !== void 0 ? _c : new ChangeNodeOwnerMap_1({ nodeID: argumentNodeID, newOwnerMapID }).MarkAsSubcommand(this)));
            this.sub_changeOwnerMapForArgument.Validate();
        }
    }
    GetDBUpdates() {
        const { nodeID } = this.payload;
        let result = {
            [`nodes/${nodeID}`]: this.newData,
        };
        if (this.sub_changeOwnerMapForArgument) {
            result = MergeDBUpdates(result, this.sub_changeOwnerMapForArgument.GetDBUpdates());
        }
        return result;
    }
};
ChangeNodeOwnerMap = ChangeNodeOwnerMap_1 = __decorate([
    UserEdit
], ChangeNodeOwnerMap);
export { ChangeNodeOwnerMap };
