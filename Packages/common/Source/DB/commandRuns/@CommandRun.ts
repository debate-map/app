import {CE} from "web-vcore/nm/js-vextensions";
import {DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";

@MGLClass({table: "commandRuns"})
export class CommandRun {
	constructor(initialData: CommandRun) {
		CE(this).VSet(initialData);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable("users").DeferRef())
	@Field({$ref: "UUID"})
	actor: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"})
	runTime: number;

	@DB((t, n)=>t.boolean(n))
	@Field({type: "boolean"})
	public: boolean;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	commandName: string;

	@DB((t, n)=>t.jsonb(n))
	@Field({$gqlType: "JSON"})
	commandPayload: any;

	@DB((t, n)=>t.jsonb(n))
	@Field({$gqlType: "JSON"})
	returnData: any;
}