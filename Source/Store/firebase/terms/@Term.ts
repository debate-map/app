import {GetValues_ForSchema} from "js-vextensions";
import {AddSchema} from "vwebapp-framework";

export class Term {
	constructor(initialData: {name: string, type: TermType} & Partial<Term>) {
		this.VSet(initialData);
		// this.createdAt = Date.now();
	}

	_key?: string;
	name: string;
	forms: string[];
	disambiguation: string;
	type: TermType;

	definition: string;
	note: string;

	creator: string;
	createdAt: number;
}
// export const termNameFormat = "^[^.#$\\[\\]]+$";
export const Term_nameFormat = '^[a-zA-Z0-9 ,\'"%-]+$';
export const Term_formsEntryFormat = "^[^A-Z]+$";
export const Term_disambiguationFormat = '^[a-zA-Z0-9 ,\'"%-\\/]+$';
// export const Term_shortDescriptionFormat = "^[a-zA-Z ()[],;.!?-+*/]+$";
//export const Term_definitionFormat = "^.+$";
export const Term_definitionFormat = "^(.|\n)+$";
AddSchema("Term", {
	properties: {
		name: {type: "string", pattern: Term_nameFormat},
		disambiguation: {type: "string", pattern: Term_disambiguationFormat},
		type: {$ref: "TermType"},
		forms: {items: {type: "string", pattern: Term_formsEntryFormat}, minItems: 1, uniqueItems: true},

		definition: {type: "string", pattern: Term_definitionFormat},
		note: {type: "string"},

		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["name", "forms", "type", "definition", /* "components", */ "creator", "createdAt"],
});

export enum TermType {
	CommonNoun = 10,
	ProperNoun = 20,
	Adjective = 30,
	Verb = 40,
	Adverb = 50,
}
AddSchema("TermType", {oneOf: GetValues_ForSchema(TermType)});

/*export type TermComponentSet = ObservableMap<string, boolean>;
AddSchema("TermComponentSet", {patternProperties: {[UUID_regex]: {type: "boolean"}}});*/