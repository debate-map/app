import {GetDoc, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {User_Private} from "./users_private/@User_Private.js";

export const GetUser_Private = CreateAccessor(c=>(userID: string|n)=>{
	return GetDoc({}, a=>a.users_private.get(userID!));
});