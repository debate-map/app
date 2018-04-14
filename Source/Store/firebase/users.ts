import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import UserExtraInfo from "./userExtras/@UserExtraInfo";
import {CachedTransform} from "js-vextensions";
import {AccessLevel} from "./nodes/@MapNode";
import {backgrounds} from "../../UI/Profile";
import {User} from "Store/firebase/users/@User";

/*export function GetAuth(state: RootState) { 
	return state.firebase.auth;
}*/
export function GetUserID(): string {
	//return state.firebase.data.auth ? state.firebase.data.auth.uid : null;
	//return GetData(state.firebase, "auth");
	/*var result = helpers.pathToJS(firebase, "auth").uid;
	return result;*/
	/*let firebaseSet = State().firebase as Set<any>;
	return firebaseSet.toJS().auth.uid;*/
	return State(a=>a.firebase.auth) ? State(a=>a.firebase.auth.uid) : null;
}

export function GetUser(userID: string): User {
	if (userID == null) return null;
	return GetData("users", userID);
}
export function GetUsers(): User[] {
	let userMap = GetData("users");
	return CachedTransform("GetUsers", [], userMap, ()=>userMap ? userMap.VValues(true) : []);
}

export type UserExtraInfoMap = {[key: string]: UserExtraInfo};
export function GetUserExtraInfoMap(): UserExtraInfoMap {
	return GetData("userExtras");
}
export function GetUserJoinDate(userID: string): number {
	if (userID == null) return null;
	return GetData("userExtras", userID, "joinDate");
}
export function GetUserPermissionGroups(userID: string): PermissionGroupSet {
	if (userID == null) return null;
	return GetData("userExtras", userID, "permissionGroups");
}
export function GetUserAccessLevel(userID: string) {
	let groups = GetUserPermissionGroups(userID);
	if (groups == null) return AccessLevel.Basic;
	
	if (groups.admin) return AccessLevel.Admin;
	if (groups.mod) return AccessLevel.Mod;
	if (groups.verified) return AccessLevel.Verified;
	//if (groups.basic) return AccessLevel.Basic;
	Assert(false);
}

/*export function GetUserInfo(userID: string) {
}*/

export function GetUserBackground(userID: string) {
	let user = GetUser(userID);
	if (!user) return backgrounds[1];

	if (user.backgroundCustom_enabled) {
		return {
			url_1920: user.backgroundCustom_url,
			url_3840: user.backgroundCustom_url,
			position: user.backgroundCustom_position || "center center",
		};
	}

	let background = backgrounds[user.backgroundID] || backgrounds[1];
	return background;
}