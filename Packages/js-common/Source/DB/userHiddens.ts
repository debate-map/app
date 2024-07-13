import {emptyArray} from "js-vextensions";
import {GetDoc, CreateAccessor, GetDocs} from "mobx-graphlink";
import {UserFollow, UserHidden} from "./userHiddens/@UserHidden.js";

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

export const GetUserFollows = CreateAccessor((userID: string|n)=>{
	const userHidden = GetUserHidden(userID);
	if (userHidden == null) return null;
	return userHidden.extras.userFollows;
});
export type UserFollow_WithUserID = UserFollow & {targetUser: string};
export const GetUserFollows_List = CreateAccessor((userID: string|n): UserFollow_WithUserID[]=>{
	const userFollows = GetUserFollows(userID);
	if (userFollows == null) return emptyArray;
	return Object.entries(userFollows).map(pair=>{
		const result = {...pair[1]};
		Object.defineProperty(result, "targetUser", {value: pair[0]}); // use defineProperty, so the "targetUser" fake-field is non-enumerable
		return result as UserFollow_WithUserID;
	});
});