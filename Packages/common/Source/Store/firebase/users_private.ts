import {GetDoc, StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {User_Private} from "./users_private/@User_Private";

export const GetUser_Private = StoreAccessor(s=>(userID: string): User_Private=>{
	return GetDoc({}, a=>a.users_private.get(userID));
});