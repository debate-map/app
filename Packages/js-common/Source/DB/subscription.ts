import {GetDocs, CreateAccessor} from "mobx-graphlink";
import {Subscription} from "../DB.js";

export const SubscriptionLevel = {
	None: "none",
	Partial: "partial",
	All: "all",
} as const;

export type SubscriptionLevel = typeof SubscriptionLevel[keyof typeof SubscriptionLevel];

export const GetSubscriptions = CreateAccessor((userId: string|n): Subscription[]=>GetDocs({
	params: {filter: {user: {equalTo: userId}}},
}, a=>a.subscriptions));

export const GetNodeSubscription = CreateAccessor((userId: string, nodeId: string): Subscription|undefined=>{
	return GetDocs({
		params: {filter: {
			user: {equalTo: userId},
			node: {equalTo: nodeId},
		}},
	}, a=>a.subscriptions)[0];
});

export const GetSubscriptionLevel = (subscription?: Subscription): SubscriptionLevel=>{
	if (!subscription) return SubscriptionLevel.None;
	const all = subscription.addChildNode && subscription.addNodeLink && subscription.addNodeRevision && subscription.deleteNode && subscription.deleteNodeLink && subscription.setNodeRating;
	const notAll = subscription.addChildNode || subscription.addNodeLink || subscription.addNodeRevision || subscription.deleteNode || subscription.deleteNodeLink || subscription.setNodeRating;
	if (all) return SubscriptionLevel.All;
	if (notAll) return SubscriptionLevel.Partial;
	return SubscriptionLevel.None;
};