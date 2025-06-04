import {CE} from "js-vextensions";
import {Field, MGLClass} from "mobx-graphlink";

/** For a command-run to be visible:
1) It must be of a command-type that can be public. (hard-coded list in CommandMacros.ts)
2) The actor must have had "Add to stream" enabled at the time of creation.
3) The array of access-policies must all allow access. (through the cached "c_groupAccess" and "c_userAccess" fields) [this part is outdated atm]
*/

export const CommandRun_commandNameValues = ["addChildNode", "addNodeRevision"] as const;
export type CommandRun_CommandName = typeof CommandRun_commandNameValues[number];

@MGLClass({table: "commandRuns"})
export class CommandRun {
	constructor(initialData: CommandRun) {
		CE(this).VSet(initialData);
	}

	@Field({$ref: "UUID"})
	id: string;

	@Field({$ref: "UUID"})
	actor: string;

	@Field({type: "number"})
	runTime: number;

	@Field({type: "boolean"})
	public_base: boolean;

	@Field({type: "string"})
	commandName: CommandRun_CommandName;

	@Field({$gqlType: "JSON"})
	commandInput: any;

	@Field({$gqlType: "JSON"})
	commandResult: any;

	@Field({items: {type: "string"}})
	c_involvedNodes: string[];

	@Field({items: {type: "string"}})
	c_accessPolicyTargets: string[]; // format is: `${policyId}:${apTable}`
}