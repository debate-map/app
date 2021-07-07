import {GetDoc, CreateAccessor, GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {UserHidden} from "./userHiddens/@UserHidden.js";

export const GetUserHidden = CreateAccessor(c=>(userID: string|n)=>{
	return GetDoc({}, a=>a.userHiddens.get(userID!));
});
export const GetUserHiddensWithEmail = CreateAccessor(c=>(email: string|n): UserHidden[]=>{
	return GetDocs({
		params: {filter: {
			email: {equalTo: email},
		}},
	}, a=>a.userHiddens);
});