import {GetDoc, StoreAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {User_Private} from "./users_private/@User_Private.js";

export const GetUser_Private = StoreAccessor(s=>(userID: string)=>{
	return GetDoc({}, a=>a.users_private.get(userID));
});