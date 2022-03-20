import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {User} from "./users/@User.js";

/*export function GetAuth(state: RootState) {
	return state.firebase.auth;
}*/
export const MeID = CreateAccessor(function(): string|n {
	// return state.firebase.data.auth ? state.firebase.data.auth.uid : null;
	// return GetData(state.firebase, "auth");
	/* var result = helpers.pathToJS(firebase, "auth").uid;
	return result; */
	/* let firebaseSet = State().firebase as Set<any>;
	return firebaseSet.toJS().auth.uid; */
	// return State(a=>a.firebase.auth) ? State(a=>a.firebase.auth.uid) : null;
	//return IsAuthValid(GetAuth()) ? GetAuth().id : null;
	/*if (DMCommon_InServer()) return systemUserID;
	return GetCookie("debate-map-userid"); // set by dm_app-server's AuthHandling.ts*/
	return this!.graph.userInfo?.id;
});
export const Me = CreateAccessor(()=>{
	const id = MeID();
	if (id == null) return null;
	return GetUser(id);
});

export const GetUser = CreateAccessor((userID: string|n): User|n=>{
	return GetDoc({}, a=>a.users.get(userID!));
});
export const GetUsers = CreateAccessor((): User[]=>{
	return GetDocs({}, a=>a.users);
});

export const GetUserReputation_Approvals = CreateAccessor((userID: string|n)=>{
	return 0;
});
export const GetUserReputation_ApprovalPercent = CreateAccessor((userID: string|n)=>{
	return 0;
});