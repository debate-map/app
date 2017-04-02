import {PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import {MapNode} from "./nodes/@MapNode";
import {GetUserPermissionGroups} from "./users";


// selectors
// ==========

/*export function BasicEditing(permissionGroups: PermissionGroupSet) {
	return permissionGroups && permissionGroups.basic;
}*/
export function IsUserBasicOrAnon(userID: string) {
	let permissionGroups = GetUserPermissionGroups(userID);
	return permissionGroups == null || permissionGroups.basic;
}
export function IsUserCreatorOrMod(userID: string, node: MapNode) {
	let permissionGroups = GetUserPermissionGroups(userID);
	return permissionGroups && ((node.creator == userID && permissionGroups.basic) || permissionGroups.mod);
}
export function IsUserAdmin(userID: string) {
	let permissionGroups = GetUserPermissionGroups(userID);
	return permissionGroups && permissionGroups.admin;
}