import {GetDoc, GetDocs, IsAuthValid, StoreAccessor} from "../../../Commands/node_modules/mobx-firelink";
import {GetAuth} from "../firebase";
import {User} from "./users/@User";

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