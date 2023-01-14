import {Assert, Clone, IsString} from "web-vcore/nm/js-vextensions.js";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetAccessPolicy, UserFulfillsPermitCriteria} from "../../DB/accessPolicies.js";
import {AccessLevel} from "../nodes/@Node.js";
import {GetUser} from "../users.js";
import {PermissionGroupSet} from "./@User.js";

// permissions
// ==========

/*export const GetUserJoinDate = CreateAccessor((userID: string): number=>{
	return GetUser(userID)?.joinDate;
});*/
const emptyUserPerms = {basic: false, verified: false, mod: false, admin: false} as PermissionGroupSet; // temp
const standardUserPerms = {basic: true, verified: true, mod: false, admin: false} as PermissionGroupSet; // temp
export const GetUserPermissionGroups = CreateAccessor((userID: string|n, upgradeAnonToStandardUserPerms = false): PermissionGroupSet=>{
	//if (userID == null) return null;
	/*if (userID == null) return standardUserPerms;
	return GetUser(userID)?.permissionGroups ?? standardUserPerms;*/
	const user = GetUser(userID);
	let result = user?.permissionGroups;
	// if null, user is not logged in; handle based on passed flag
	if (result == null) {
		result = upgradeAnonToStandardUserPerms ? Clone(standardUserPerms) as PermissionGroupSet : emptyUserPerms;
	}
	return result;
});

export const CanGetBasicPermissions = CreateAccessor((userIDOrPermissions: string | PermissionGroupSet | n)=>{
	// if (true) return HasModPermissions(userIDOrPermissions); // temp; will be removed once GAD is over

	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions == null || permissions.basic; // if anon/not-logged-in, assume user can get basic permissions once logged in
});
export const HasBasicPermissions = CreateAccessor((userIDOrPermissions: string | PermissionGroupSet | n)=>{
	// if (true) return HasModPermissions(userIDOrPermissions); // temp; will be removed once GAD is over

	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions ? permissions.basic : false;
});
export const HasModPermissions = CreateAccessor((userIDOrPermissions: string | PermissionGroupSet | n)=>{
	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions ? permissions.mod : false;
});
export const HasAdminPermissions = CreateAccessor((userIDOrPermissions: string | PermissionGroupSet | n)=>{
	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions ? permissions.admin : false;
});
// /** If user is the creator, also requires that they (still) have basic permissions. */
export const IsUserCreator = CreateAccessor((userID: string|n, entity: {creator?: string}|n)=>{
	return (entity?.creator === userID /*&& HasBasicPermissions(userID)*/);
});
// /** If user is the creator, also requires that they (still) have basic permissions. */
export const IsUserCreatorOrMod = CreateAccessor((userID: string|n, entity: {creator?: string}|n)=>{
	return (entity?.creator === userID /*&& HasBasicPermissions(userID)*/) || HasModPermissions(userID);
});
// /** If user is the creator, also requires that they (still) have basic permissions. */
export const IsUserCreatorOrAdmin = CreateAccessor((userID: string|n, entity: {creator?: string}|n)=>{
	return (entity?.creator === userID /*&& HasBasicPermissions(userID)*/) || HasAdminPermissions(userID);
});

/*export const CanSubmitRevisions = CreateAccessor((userID: string, nodeID: string): boolean=>{
	// mods and admins can always edit
	if (HasModPermissions(userID) || HasAdminPermissions(userID)) {
		return true;
	}

	/*let user = GetUser(userID);
	if (user == null) return false;*#/
	const node = GetNodeL2(nodeID);
	if (node == null) return false;
	const revision = node.current;

	// probably temp
	const editPerm = revision.permission_edit ?? {type: PermissionInfoType.anyone};

	if (editPerm.type == PermissionInfoType.anyone) {
		return CanGetBasicPermissions(userID);
	}
	if (editPerm.type == PermissionInfoType.creator) {
		return revision.creator == userID;
	}
	if (editPerm.type == PermissionInfoType.mapEditors) {
		if (revision.creator == userID) return true; // node-creator can always edit
		const map = GetMap(node.ownerMapID);
		return map?.editors?.includes(userID) ?? false;
	}
	Assert(false, "Invalid permission-info-type.");
});*/

/*export const CanContributeToNode = CreateAccessor((userID: string, nodeID: string): boolean=>{
	// mods and admins can always contribute
	if (HasModPermissions(userID) || HasAdminPermissions(userID)) {
		return true;
	}

	/*let user = GetUser(userID);
	if (user == null) return false;*#/
	const node = GetNodeL2(nodeID);
	if (node == null) return false;
	const revision = node.current;

	// probably temp
	const contributePerm = revision.permission_contribute ?? {type: PermissionInfoType.anyone};

	if (contributePerm.type == PermissionInfoType.anyone) {
		return CanGetBasicPermissions(userID);
	}
	if (contributePerm.type == PermissionInfoType.creator) {
		return revision.creator == userID;
	}
	if (contributePerm.type == PermissionInfoType.mapEditors) {
		if (revision.creator == userID) return true; // node-creator can always contribute
		const map = GetMap(node.ownerMapID);
		return map?.editors?.includes(userID) ?? false;
	}
	Assert(false, "Invalid permission-info-type.");
});*/

// new set (aware of access-policies)
// ==========

export const CanAddPhrasing = CreateAccessor((userID: string|n, accessPolicyID: string, upgradeAnonToStandardUserPerms = true)=>{
	const groups = GetUserPermissionGroups(userID, upgradeAnonToStandardUserPerms);
	if (groups.mod) return true; // mods can always add phrasings

	const accessPolicy = GetAccessPolicy.NN(accessPolicyID);
	const userPermOverride = accessPolicy.permissions_userExtends[userID as any];
	if (userPermOverride) return UserFulfillsPermitCriteria(userID, userPermOverride.nodes.addPhrasing); // if user-specific perm-override is set, use that
	return UserFulfillsPermitCriteria(userID, accessPolicy.permissions.nodes.addPhrasing); // else use the default for everyone
});