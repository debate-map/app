import {CE} from "web-vcore/nm/js-vextensions";
import {DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";

/** For a command-run to be visible:
1) It must be of a command-type that can be public. (hard-coded list in CommandMacros.ts)
2) The actor must have had "Add to stream" enabled at the time of creation.
3) The array of access-policies must all allow access. (through the cached "c_groupAccess" and "c_userAccess" fields) [this part is outdated atm]
*/

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
	public_base: boolean;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	commandName: string;

	@DB((t, n)=>t.jsonb(n))
	@Field({$gqlType: "JSON"})
	commandPayload: any;

	@DB((t, n)=>t.jsonb(n))
	@Field({$gqlType: "JSON"})
	returnData: any;

	@DB((t, n)=>t.jsonb(n))
	@Field({$ref: "RLSTargetSet"})
	rlsTargets: RLSTargetSet;
}

// the target keys in this class are stored as simple strings (rather than db foreign-keys), because we want these CommandRun entries to exist even if the target objects are deleted
@MGLClass()
export class RLSTargetSet {
	constructor(data?: Partial<RLSTargetSet>) {
		this.VSet(data);
	}

	@Field({
		//$gqlType: "string[]", // todo: make this line unnecessary at some point
		$gqlType: "JSON", // todo: make this line unnecessary at some point
		items: {$ref: "UUID"},
	}, {opt: true})
	nodes? = [] as string[];
}