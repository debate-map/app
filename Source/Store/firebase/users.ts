import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import {User} from "firebase";

/*export function GetAuth(state: RootState) { 
	return state.firebase.auth;
}*/

export function GetUsers() {
	return GetData(`users`) as User[];
}

export function GetUserID(): string {
	//return state.firebase.data.auth ? state.firebase.data.auth.uid : null;
	//return GetData(state.firebase, "auth");
	/*var result = helpers.pathToJS(firebase, "auth").uid;
	return result;*/
	/*let firebaseSet = State().firebase as Set<any>;
	return firebaseSet.toJS().auth.uid;*/
	return State().firebase.get("auth") ? State().firebase.get("auth").uid : null;
}
export function GetUserPermissionGroups(userID: string): PermissionGroupSet {
	return GetData(`userExtras/${userID}/permissionGroups`);
}