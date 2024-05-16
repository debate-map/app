import {GetDocs, CreateAccessor} from "mobx-graphlink";
import {Subscription} from "../DB.js";

export const GetNodeSubscriptions = CreateAccessor((userId: string, nodeId: string): Subscription[]=>{
	return GetDocs({
		params: {filter: {
            user: {equalTo: userId},
            node: {equalTo: nodeId},
		}},
	}, a=>a.subscriptions);
});