import {GetValues_ForSchema, CE, CreateStringEnum, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";
import {Attachment} from "../../DB.js";

// export const termNameFormat = "^[^.#$\\[\\]]+$";
//export const Term_nameFormat = '^[a-zA-Z0-9 ,\'"%-]+$';
export const Term_formsEntryFormat = "^[^A-Z]+$";
export const Term_disambiguationFormat = '^[a-zA-Z0-9 ,\'"%-\\/]+$';
// export const Term_shortDescriptionFormat = "^[a-zA-Z ()[],;.!?-+*/]+$";
//export const Term_definitionFormat = "^.+$";
export const Term_definitionFormat = "^(.|\n)+$";

@MGLClass({table: "terms"})
export class Term {
	constructor(initialData: {name: string, type: TermType} & Partial<Term>) {
		CE(this).VSet(initialData);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	accessPolicy: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@DB((t, n)=>t.text(n))
	//@Field({type: "string", pattern: Term_nameFormat}) // commented atm, since too strict
	@Field({type: "string"})
	name: string;

	@DB((t, n)=>t.specificType(n, "text[]"))
	@Field({items: {type: "string", pattern: Term_formsEntryFormat}, minItems: 1, uniqueItems: true})
	forms: string[];

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string", pattern: Term_disambiguationFormat}, {opt: true})
	disambiguation?: string;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "TermType"})
	type: TermType;

	@DB((t, n)=>t.text(n))
	@Field({type: "string", pattern: Term_definitionFormat})
	definition: string;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	note?: string;

	@DB((t, n)=>t.jsonb(n))
	@Field({items: {$ref: "Attachment"}})
	attachments: Attachment[] = [];
}

export enum TermType {
	commonNoun = "commonNoun",
	properNoun = "properNoun",
	adjective = "adjective",
	verb = "verb",
	adverb = "adverb",
}
AddSchema("TermType", {enum: GetValues(TermType)});