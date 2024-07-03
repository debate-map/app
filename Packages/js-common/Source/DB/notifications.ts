import {GetDocs, CreateAccessor} from "mobx-graphlink";
import {NodeType} from "../DB.js";

export const GetNotifications = CreateAccessor((userId: string|n)=>{
	return GetDocs({
		params: {
			filter: {
				user: {equalTo: userId},
			},
		},
	}, a=>a.notifications);
});

export const ShowNotification = (type: NodeType)=>{
	return [NodeType.category, NodeType.claim, NodeType.package, NodeType.multiChoiceQuestion].includes(type);
};