import {GetDoc, CreateAccessor, GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {UserHidden} from "./userHiddens/@UserHidden.js";

export const GetUserHidden = CreateAccessor((userID: string|n)=>{
	return GetDoc({}, a=>a.userHiddens.get(userID!));
});
export const GetUserHiddensWithEmail = CreateAccessor((email: string|n): UserHidden[]=>{
	return GetDocs({
		params: {filter: {
			email: {equalTo: email},
		}},
	}, a=>a.userHiddens);
});