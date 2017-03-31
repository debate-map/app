import {GetData} from "../../Frame/Database/DatabaseHelpers";

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
export function GetUserPermissionGroups_Path(userID: string) {
	return `userExtras/${userID}/permissionGroups`;
}
export function GetUserPermissionGroups(userID: string) {
	return GetData(GetUserPermissionGroups_Path(userID));
}