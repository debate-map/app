import chroma from "chroma-js";
import {AddSchema, Field, MGLClass} from "mobx-graphlink";

@MGLClass({table: "notifications"})
export class Notification {
	constructor(data?: Partial<Notification>) {
		Object.assign(this, data);
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"})
	user: string;

	@Field({type: "string"})
	commandRun: string;

	@Field({type: "number"}, {opt: true})
	readTime?: number|n;
}