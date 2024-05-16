import {GetDocs, CreateAccessor} from "mobx-graphlink";
import {Subscription} from "../DB.js";

export const GetNodeSubscription = CreateAccessor((userId: string, nodeId: string): Subscription|undefined=>{
	return GetDocs({
		params: {filter: {
			user: {equalTo: userId},
			node: {equalTo: nodeId},
		}},
	}, a=>a.subscriptions)[0];
});