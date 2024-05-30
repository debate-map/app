import {GetDocs, CreateAccessor} from "mobx-graphlink";
import {Subscription} from "../DB.js";

export const GetNotifications = CreateAccessor((userId: string|n)=>{
	return GetDocs({
		params: {filter: {
			user: {equalTo: userId},
		}},
	}, a=>a.notifications);
});