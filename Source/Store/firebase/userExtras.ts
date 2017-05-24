import {PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import {MapNode} from "./nodes/@MapNode";
import {GetUserPermissionGroups} from "./users";
import {Term} from "./terms/@Term";
import {Image} from "./images/@Image";


// selectors
// ==========

/*export function BasicEditing(permissionGroups: PermissionGroupSet) {
	return permissionGroups && permissionGroups.basic;
}*/
export function IsUserBasicOrAnon(userID: string) {
	let permissionGroups = GetUserPermissionGroups(userID);
	return permissionGroups == null || permissionGroups.basic;
}
export function IsUserCreatorOrMod(userID: string, entity: Term | Image | MapNode) {
	let permissionGroups = GetUserPermissionGroups(userID);
	if (permissionGroups == null) return false;
	return (entity.creator == userID && permissionGroups.basic) || permissionGroups.mod;
}
export function IsUserMod(userID: string) {
	let permissionGroups = GetUserPermissionGroups(userID);
	if (permissionGroups == null) return false;
	return permissionGroups.mod;
}
export function IsUserAdmin(userID: string) {
	let permissionGroups = GetUserPermissionGroups(userID);
	if (permissionGroups == null) return false;
	return permissionGroups.admin;
}
/*export function IsUserModOrAdmin(userID: string) {
	let permissionGroups = GetUserPermissionGroups(userID);
	if (permissionGroups == null) return false;
	return permissionGroups.mod || permissionGroups.admin;
}*/