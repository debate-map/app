import {CachedTransform, Assert} from "js-vextensions";
import {User} from "Store/firebase/users/@User";
import {presetBackgrounds, defaultPresetBackground, BackgroundConfig} from "Utils/UI/PresetBackgrounds";
import {GADDemo} from "UI/@GAD/GAD";
import {GetAuth} from "Store/firebase";
import {IsAuthValid, GetDoc, GetDocs, StoreAccessor} from "mobx-firelink";
import {AccessLevel} from "./nodes/@MapNode";
import {UserExtraInfo, PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import {GetNode} from "./nodes";
import {GetNodeL2} from "./nodes/$node";
import {PermissionInfo, PermissionInfoType} from "./nodes/@MapNodeRevision";
import {HasModPermissions, HasAdminPermissions, CanGetBasicPermissions} from "./userExtras";
import {GetMap} from "./maps";

/* export function GetAuth(state: RootState) {
	return state.firebase.auth;
} */
export const MeID = StoreAccessor(s=>(): string=>{
	// return state.firebase.data.auth ? state.firebase.data.auth.uid : null;
	// return GetData(state.firebase, "auth");
	/* var result = helpers.pathToJS(firebase, "auth").uid;
	return result; */
	/* let firebaseSet = State().firebase as Set<any>;
	return firebaseSet.toJS().auth.uid; */
	// return State(a=>a.firebase.auth) ? State(a=>a.firebase.auth.uid) : null;
	return IsAuthValid(GetAuth()) ? GetAuth().id : null;
});
export const Me = StoreAccessor(s=>()=>{
	return GetUser(MeID());
});

export const GetUser = StoreAccessor(s=>(userID: string): User=>{
	return GetDoc({}, a=>a.users.get(userID));
});
export const GetUsers = StoreAccessor(s=>(): User[]=>{
	return GetDocs({}, a=>a.users);
});

/* export type UserExtraInfoMap = { [key: string]: UserExtraInfo };
export const GetUserExtraInfoMap = StoreAccessor((s) => (): UserExtraInfoMap => {
	return GetDocs((a) => a.userExtras);
}); */
export const GetUserExtraInfo = StoreAccessor(s=>(userID: string): UserExtraInfo=>{
	return GetDoc({}, a=>a.userExtras.get(userID));
});
export const GetUserJoinDate = StoreAccessor(s=>(userID: string): number=>{
	return GetDoc({}, a=>a.userExtras.get(userID))?.joinDate;
});
const defaultPermissions = {basic: true, verified: true, mod: false, admin: false} as PermissionGroupSet; // temp
export const GetUserPermissionGroups = StoreAccessor(s=>(userID: string): PermissionGroupSet=>{
	if (userID == null) return null;
	return GetDoc({}, a=>a.userExtras.get(userID))?.permissionGroups ?? defaultPermissions;
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

export function GetUserBackground(userID: string): BackgroundConfig {
	if (GADDemo) return {color: "#ffffff"};

	const user = GetUser(userID);
	if (!user) return presetBackgrounds[defaultPresetBackground];

	if (user.backgroundCustom_enabled) {
		return {
			color: user.backgroundCustom_color,
			url_1920: user.backgroundCustom_url,
			url_3840: user.backgroundCustom_url,
			url_max: user.backgroundCustom_url,
			position: user.backgroundCustom_position || "center center",
		};
	}

	const background = presetBackgrounds[user.backgroundID] || presetBackgrounds[defaultPresetBackground];
	return background;
}

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
		return map?.editorIDs?.Contains(userID) ?? false;
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
		return map?.editorIDs?.Contains(userID) ?? false;
	}
	Assert(false, "Invalid permission-info-type.");
});