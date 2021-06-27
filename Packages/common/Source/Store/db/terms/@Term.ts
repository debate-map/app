import {GetValues_ForSchema, CE, CreateStringEnum} from "web-vcore/nm/js-vextensions";
import {AddSchema, DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink";

// export const termNameFormat = "^[^.#$\\[\\]]+$";
export const Term_nameFormat = '^[a-zA-Z0-9 ,\'"%-]+$';
export const Term_formsEntryFormat = "^[^A-Z]+$";
export const Term_disambiguationFormat = '^[a-zA-Z0-9 ,\'"%-\\/]+$';
// export const Term_shortDescriptionFormat = "^[a-zA-Z ()[],;.!?-+*/]+$";
//export const Term_definitionFormat = "^.+$";
export const Term_definitionFormat = "^(.|\n)+$";

@MGLClass({table: "terms"})
export class Term {
	constructor(initialData: {name: string, type: TermType} & Partial<Term>) {
		CE(this).VSet(initialData);
		// this.createdAt = Date.now();
	}

	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {req: true})
	creator: string;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"}, {req: true})
	createdAt: number;

	@DB((t,n)=>t.text(n))
	@Field({type: "string", pattern: Term_nameFormat}, {req: true})
	name: string;

	@DB((t,n)=>t.specificType(n, "text[]"))
	@Field({items: {type: "string", pattern: Term_formsEntryFormat}, minItems: 1, uniqueItems: true}, {req: true})
	forms: string[];

	@DB((t,n)=>t.text(n))
	@Field({type: "string", pattern: Term_disambiguationFormat})
	disambiguation: string;

	@DB((t,n)=>t.text(n))
	@Field({$ref: "TermType"}, {req: true})
	type: TermType;

	@DB((t,n)=>t.text(n))
	@Field({type: "string", pattern: Term_definitionFormat}, {req: true})
	definition: string;

	@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	note: string;
}

export enum TermType {
	commonNoun = "commonNoun",
	properNoun = "properNoun",
	adjective = "adjective",
	verb = "verb",
	adverb = "adverb",
}
AddSchema("TermType", {oneOf: GetValues_ForSchema(TermType)});

/*export type TermComponentSet = ObservableMap<string, boolean>;
AddSchema("TermComponentSet", {patternProperties: {[UUID_regex]: {type: "boolean"}}});*/