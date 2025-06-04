import {AddSchema, Field, MGLClass} from "mobx-graphlink";

@MGLClass({table: "subscriptions"})
export class Subscription {
	constructor(data?: Partial<Subscription>) {
		Object.assign(this, data);
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"})
	user: string;

	@Field({type: "string"})
	node: string;

	@Field({type: "boolean"})
	addChildNode: boolean;

	@Field({type: "boolean"})
	deleteNode: boolean;

	@Field({type: "boolean"})
	addNodeLink: boolean;

	@Field({type: "boolean"})
	deleteNodeLink: boolean;

	@Field({type: "boolean"})
	addNodeRevision: boolean;

	@Field({type: "boolean"})
	setNodeRating: boolean;

	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@Field({type: "number"}, {opt: true})
	updatedAt: number;
}