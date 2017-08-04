export default class UserExtraInfo {
	constructor(initialData: Partial<UserExtraInfo>) {
		this.Extend(initialData);
	}
	joinDate: number;
	permissionGroups: PermissionGroupSet;

	edits: number;
	lastEditAt: number;
}
AddSchema({
	properties: {
		edits: {type: "number"},
		lastEditAt: {type: "number"},
	},
}, "UserExtraInfo");

export class PermissionGroupSet {
	basic: boolean;
	verified: boolean;
	mod: boolean;
	admin: boolean;
}

export function CanGetBasicPermissions(permissions: PermissionGroupSet) {
	return permissions == null || permissions.basic; // if anon/not-logged-in, assume user can get basic permissions once logged in
}
export function HasBasicPermissions(permissions: PermissionGroupSet) {
	return permissions && permissions.basic;
}
export function HasModPermissions(permissions: PermissionGroupSet) {
	return permissions && permissions.mod;
}
export function HasAdminPermissions(permissions: PermissionGroupSet) {
	return permissions && permissions.admin;
}