import {GetValues_ForSchema} from "js-vextensions";
import {AddSchema} from "vwebapp-framework";
import {UUID_regex} from "Utils/General/KeyGenerator";
import {ObservableMap} from "mobx";

export class Term {
	constructor(initialData: {name: string, type: TermType} & Partial<Term>) {
		this.VSet(initialData);
		// this.createdAt = Date.now();
	}

	_key?: string;
	name: string;
	disambiguation: string;
	type: TermType;
	person?: boolean;
	// name_gerund: string;
	// otherForms: string[];

	definition: string;
	note: string;

	// openAccess: boolean;
	// components: TermComponent[];
	//components: TermComponentSet;

	creator: string;
	createdAt: number;
}
// export const termNameFormat = "^[^.#$\\[\\]]+$";
export const Term_nameFormat = '^[a-zA-Z0-9 ,\'"%-]+$';
export const Term_disambiguationFormat = '^[a-zA-Z0-9 ,\'"%-\\/]+$';
// export const Term_shortDescriptionFormat = "^[a-zA-Z ()[],;.!?-+*/]+$";
//export const Term_definitionFormat = "^.+$";
export const Term_definitionFormat = "^(.|\n)+$";
AddSchema("Term", {
	properties: {
		name: {type: "string", pattern: Term_nameFormat},
		disambiguation: {type: "string", pattern: Term_disambiguationFormat},
		type: {$ref: "TermType"},
		person: {type: "boolean"},
		// name_gerund: {type: "string"},
		// otherForms: {items: {type: "string"}},

		definition: {type: "string", pattern: Term_definitionFormat},
		note: {type: "string"},

		// components: {items: {$ref: "TermComponent"}},
		//components: {$ref: "TermComponentSet"},

		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["name", "type", "definition", /* "components", */ "creator", "createdAt"],
});

export enum TermType {
	ProperNoun = 10,
	CommonNoun = 20,
	Adjective = 30,
	Verb = 40,
	Adverb = 50,
}
AddSchema("TermType", {oneOf: GetValues_ForSchema(TermType)});

/*export type TermComponentSet = ObservableMap<string, boolean>;
AddSchema("TermComponentSet", {patternProperties: {[UUID_regex]: {type: "boolean"}}});*/