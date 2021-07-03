import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
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
	return null;
});
export const Me = CreateAccessor(c=>()=>{
	const id = MeID();
	if (id == null) return null;
	return GetUser(id);
});

export const GetUser = CreateAccessor(c=>(userID: string): User|n=>{
	return GetDoc({}, a=>a.users.get(userID));
});
export const GetUsers = CreateAccessor(c=>(): User[]=>{
	return GetDocs({}, a=>a.users);
});