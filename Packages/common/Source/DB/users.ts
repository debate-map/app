import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetCookie} from "web-vcore";
import {systemUserID} from "../DB_Constants.js";
import {User} from "./users/@User.js";

/*export function GetAuth(state: RootState) {
	return state.firebase.auth;
}*/
export const MeID = CreateAccessor(c=>(): string|n=>{
	// return state.firebase.data.auth ? state.firebase.data.auth.uid : null;
	// return GetData(state.firebase, "auth");
	/* var result = helpers.pathToJS(firebase, "auth").uid;
	return result; */
	/* let firebaseSet = State().firebase as Set<any>;
	return firebaseSet.toJS().auth.uid; */
	// return State(a=>a.firebase.auth) ? State(a=>a.firebase.auth.uid) : null;
	//return IsAuthValid(GetAuth()) ? GetAuth().id : null;
	/*if (DMCommon_InServer()) return systemUserID;
	return GetCookie("debate-map-userid"); // set by dm_server's AuthHandling.ts*/
	return c.graph.userInfo?.id;
});
export const Me = CreateAccessor(c=>()=>{
	const id = MeID();
	if (id == null) return null;
	return GetUser(id);
});

export const GetUser = CreateAccessor(c=>(userID: string|n): User|n=>{
	return GetDoc({}, a=>a.users.get(userID!));
});
export const GetUsers = CreateAccessor(c=>(): User[]=>{
	return GetDocs({}, a=>a.users);
});