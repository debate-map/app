import {GetValues_ForSchema, CE} from "../../../../Commands/node_modules/js-vextensions";
import {AddSchema} from "../../../../Commands/node_modules/mobx-firelink";

export class Term {
	constructor(initialData: {name: string, type: TermType} & Partial<Term>) {
		CE(this).VSet(initialData);
		// this.createdAt = Date.now();
	}

	_key?: string;
	creator: string;
	createdAt: number;

	name: string;
	forms: string[];
	disambiguation: string;
	type: TermType;

	definition: string;
	note: string;

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
		creator: {type: "string"},
		createdAt: {type: "number"},

		name: {type: "string", pattern: Term_nameFormat},
		disambiguation: {type: "string", pattern: Term_disambiguationFormat},
		type: {$ref: "TermType"},
		forms: {items: {type: "string", pattern: Term_formsEntryFormat}, minItems: 1, uniqueItems: true},

		definition: {type: "string", pattern: Term_definitionFormat},
		note: {type: "string"},
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