import chroma from "chroma-js";
import {AddSchema, DB, Field, MGLClass} from "mobx-graphlink";

@MGLClass({table: "notifications"})
export class Notification {
	constructor(data?: Partial<Notification>) {
		Object.assign(this, data);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	user: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	commandRun: string;

	@DB((t, n)=>t.bigInteger(n).nullable())
	@Field({type: "number"}, {opt: true})
	readTime?: number|n;
}