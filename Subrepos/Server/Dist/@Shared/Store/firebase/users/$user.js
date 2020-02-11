import { Assert, IsString } from "js-vextensions";
import { StoreAccessor } from "mobx-firelink";
import { GetMap } from "../maps";
import { GetNodeL2 } from "../nodes/$node";
import { AccessLevel } from "../nodes/@MapNode";
import { PermissionInfoType } from "../nodes/@MapNodeRevision";
import { GetUser } from "../users";
// permissions
// ==========
/*export const GetUserJoinDate = StoreAccessor(s=>(userID: string): number=>{
    return GetUser(userID)?.joinDate;
});*/
const defaultPermissions = { basic: true, verified: true, mod: false, admin: false }; // temp
export const GetUserPermissionGroups = StoreAccessor(s => (userID) => {
    var _a, _b;
    if (userID == null)
        return null;
    return _b = (_a = GetUser(userID)) === null || _a === void 0 ? void 0 : _a.permissionGroups, (_b !== null && _b !== void 0 ? _b : defaultPermissions);
});
export function GetUserAccessLevel(userID) {
    const groups = GetUserPermissionGroups(userID);
    if (groups == null)
        return AccessLevel.Basic;
    if (groups.admin)
        return AccessLevel.Admin;
    if (groups.mod)
        return AccessLevel.Mod;
    if (groups.verified)
        return AccessLevel.Verified;
    // if (groups.basic) return AccessLevel.Basic;
    Assert(false);
}
export const CanGetBasicPermissions = StoreAccessor(s => (userIDOrPermissions) => {
    // if (true) return HasModPermissions(userIDOrPermissions); // temp; will be removed once GAD is over
    const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
    return permissions == null || permissions.basic; // if anon/not-logged-in, assume user can get basic permissions once logged in
});
export const HasBasicPermissions = StoreAccessor(s => (userIDOrPermissions) => {
    // if (true) return HasModPermissions(userIDOrPermissions); // temp; will be removed once GAD is over
    const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
    return permissions ? permissions.basic : false;
});
export const HasModPermissions = StoreAccessor(s => (userIDOrPermissions) => {
    const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
    return permissions ? permissions.mod : false;
});
export const HasAdminPermissions = StoreAccessor(s => (userIDOrPermissions) => {
    const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
    return permissions ? permissions.admin : false;
});
/** If user is the creator, also requires that they (still) have basic permissions. */
//export const IsUserCreatorOrMod = StoreAccessor(s=>(userID: string, entity: Term | Image | Map | MapNode | MapNodePhrasing | Timeline /* | Post | Thread */)=>{
export const IsUserCreatorOrMod = StoreAccessor(s => (userID, entity) => {
    return (entity && entity.creator === userID && HasBasicPermissions(userID)) || HasModPermissions(userID);
});
export const CanEditNode = StoreAccessor(s => (userID, nodeID) => {
    var _a, _b, _c, _d;
    // mods and admins can always edit
    if (HasModPermissions(userID) || HasAdminPermissions(userID)) {
        return true;
    }
    /* let user = GetUser(userID);
    if (user == null) return false; */
    const node = GetNodeL2(nodeID);
    if (node == null)
        return false;
    const revision = node.current;
    // probably temp
    const editPerm = (_a = revision.permission_edit, (_a !== null && _a !== void 0 ? _a : { type: PermissionInfoType.Anyone }));
    if (editPerm.type == PermissionInfoType.Anyone) {
        return CanGetBasicPermissions(userID);
    }
    if (editPerm.type == PermissionInfoType.Creator) {
        return revision.creator == userID;
    }
    if (editPerm.type == PermissionInfoType.MapEditors) {
        if (revision.creator == userID)
            return true; // node-creator can always edit
        const map = GetMap(node.ownerMapID);
        return _d = (_c = (_b = map) === null || _b === void 0 ? void 0 : _b.editorIDs) === null || _c === void 0 ? void 0 : _c.includes(userID), (_d !== null && _d !== void 0 ? _d : false);
    }
    Assert(false, "Invalid permission-info-type.");
});
export const CanContributeToNode = StoreAccessor(s => (userID, nodeID) => {
    var _a, _b, _c, _d;
    // mods and admins can always contribute
    if (HasModPermissions(userID) || HasAdminPermissions(userID)) {
        return true;
    }
    /* let user = GetUser(userID);
    if (user == null) return false; */
    const node = GetNodeL2(nodeID);
    if (node == null)
        return false;
    const revision = node.current;
    // probably temp
    const contributePerm = (_a = revision.permission_contribute, (_a !== null && _a !== void 0 ? _a : { type: PermissionInfoType.Anyone }));
    if (contributePerm.type == PermissionInfoType.Anyone) {
        return CanGetBasicPermissions(userID);
    }
    if (contributePerm.type == PermissionInfoType.Creator) {
        return revision.creator == userID;
    }
    if (contributePerm.type == PermissionInfoType.MapEditors) {
        if (revision.creator == userID)
            return true; // node-creator can always contribute
        const map = GetMap(node.ownerMapID);
        return _d = (_c = (_b = map) === null || _b === void 0 ? void 0 : _b.editorIDs) === null || _c === void 0 ? void 0 : _c.includes(userID), (_d !== null && _d !== void 0 ? _d : false);
    }
    Assert(false, "Invalid permission-info-type.");
});
