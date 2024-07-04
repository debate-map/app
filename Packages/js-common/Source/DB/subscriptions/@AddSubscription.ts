import {Subscription} from "./@Subscription.js";

export type AddSubscriptionInput = Omit<Subscription, "user" | "id" | "createdAt" | "updatedAt">;