import {Assert, IsString} from "js-vextensions";
import {StoreAccessor} from "mobx-firelink";
import {GetMap} from "../maps";
import {MapNodePhrasing} from "../nodePhrasings/@MapNodePhrasing";
import {GetNodeL2} from "../nodes/$node";
import {AccessLevel, MapNode} from "../nodes/@MapNode";
import {PermissionInfoType} from "../nodes/@MapNodeRevision";
import {Term} from "../terms/@Term";
import {Timeline} from "../timelines/@Timeline";
import {GetUser} from "../users";
import {GetUser_Private} from "../users_private";
import {Image} from "../images/@Image";
import {Map} from "../maps/@Map";
import {PermissionGroupSet} from "./@User";

// permissions
// ==========

/*export const GetUserJoinDate = StoreAccessor(s=>(userID: string): number=>{
	return GetUser(userID)?.joinDate;
});*/
const defaultPermissions = {basic: true, verified: true, mod: false, admin: false} as PermissionGroupSet; // temp
export const GetUserPermissionGroups = StoreAccessor(s=>(userID: string): PermissionGroupSet=>{
	if (userID == null) return null;
	return GetUser(userID)?.permissionGroups ?? defaultPermissions;
});
export function GetUserAccessLevel(userID: string) {
	const groups = GetUserPermissionGroups(userID);
	if (groups == null) return AccessLevel.Basic;

	if (groups.admin) return AccessLevel.Admin;
	if (groups.mod) return AccessLevel.Mod;
	if (groups.verified) return AccessLevel.Verified;
	// if (groups.basic) return AccessLevel.Basic;
	Assert(false);
}

export const CanGetBasicPermissions = StoreAccessor(s=>(userIDOrPermissions: string | PermissionGroupSet)=>{
	// if (true) return HasModPermissions(userIDOrPermissions); // temp; will be removed once GAD is over

	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions == null || permissions.basic; // if anon/not-logged-in, assume user can get basic permissions once logged in
});
export const HasBasicPermissions = StoreAccessor(s=>(userIDOrPermissions: string | PermissionGroupSet)=>{
	// if (true) return HasModPermissions(userIDOrPermissions); // temp; will be removed once GAD is over

	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions ? permissions.basic : false;
});
export const HasModPermissions = StoreAccessor(s=>(userIDOrPermissions: string | PermissionGroupSet)=>{
	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions ? permissions.mod : false;
});
export const HasAdminPermissions = StoreAccessor(s=>(userIDOrPermissions: string | PermissionGroupSet)=>{
	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions ? permissions.admin : false;
});
/** If user is the creator, also requires that they (still) have basic permissions. */
//export const IsUserCreatorOrMod = StoreAccessor(s=>(userID: string, entity: Term | Image | Map | MapNode | MapNodePhrasing | Timeline /* | Post | Thread */)=>{
export const IsUserCreatorOrMod = StoreAccessor(s=>(userID: string, entity: {creator?: string})=>{
	return (entity && entity.creator === userID && HasBasicPermissions(userID)) || HasModPermissions(userID);
});

export const CanEditNode = StoreAccessor(s=>(userID: string, nodeID: string): boolean=>{
	// mods and admins can always edit
	if (HasModPermissions(userID) || HasAdminPermissions(userID)) {
		return true;
	}

	/* let user = GetUser(userID);
	if (user == null) return false; */
	const node = GetNodeL2(nodeID);
	if (node == null) return false;
	const revision = node.current;

	// probably temp
	const editPerm = revision.permission_edit ?? {type: PermissionInfoType.Anyone};

	if (editPerm.type == PermissionInfoType.Anyone) {
		return CanGetBasicPermissions(userID);
	}
	if (editPerm.type == PermissionInfoType.Creator) {
		return revision.creator == userID;
	}
	if (editPerm.type == PermissionInfoType.MapEditors) {
		if (revision.creator == userID) return true; // node-creator can always edit
		const map = GetMap(node.ownerMapID);
		return map?.editorIDs?.includes(userID) ?? false;
	}
	Assert(false, "Invalid permission-info-type.");
});

export const CanContributeToNode = StoreAccessor(s=>(userID: string, nodeID: string): boolean=>{
	// mods and admins can always contribute
	if (HasModPermissions(userID) || HasAdminPermissions(userID)) {
		return true;
	}

	/* let user = GetUser(userID);
	if (user == null) return false; */
	const node = GetNodeL2(nodeID);
	if (node == null) return false;
	const revision = node.current;

	// probably temp
	const contributePerm = revision.permission_contribute ?? {type: PermissionInfoType.Anyone};

	if (contributePerm.type == PermissionInfoType.Anyone) {
		return CanGetBasicPermissions(userID);
	}
	if (contributePerm.type == PermissionInfoType.Creator) {
		return revision.creator == userID;
	}
	if (contributePerm.type == PermissionInfoType.MapEditors) {
		if (revision.creator == userID) return true; // node-creator can always contribute
		const map = GetMap(node.ownerMapID);
		return map?.editorIDs?.includes(userID) ?? false;
	}
	Assert(false, "Invalid permission-info-type.");
});