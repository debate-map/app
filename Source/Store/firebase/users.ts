import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import UserExtraInfo from "./userExtras/@UserExtraInfo";
import {CachedTransform} from "../../Frame/V/VCache";
import {UserInfo} from "firebase";

export type User = {
	avatarUrl: string;
	displayName: string;
	email: string;
	providerData: UserInfo[];
};

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
	return State().firebase.get("auth") ? State().firebase.get("auth").uid : null;
}

export type UserMap = {[key: string]: User};
export function GetUserMap(): UserMap {
	return GetData(`users`);
}
export function GetUser(userID: string): User {
	return (GetUserMap() || {})[userID];
}
export function GetUsers(): User[] {
	let userMap = GetUserMap();
	return CachedTransform("GetUsers", {}, userMap, ()=>userMap ? userMap.VValues(true) : []);
}

export type UserExtraInfoMap = {[key: string]: UserExtraInfo};
export function GetUserExtraInfoMap(): UserExtraInfoMap {
	return GetData(`userExtras`);
}
export function GetUserJoinDate(userID: string): number {
	return GetData(`userExtras/${userID}/joinDate`);
}
export function GetUserPermissionGroups(userID: string): PermissionGroupSet {
	return GetData(`userExtras/${userID}/permissionGroups`);
}