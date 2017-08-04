import {GetValues_ForSchema} from "../../../Frame/General/Enums";

export class Term {
	constructor(initialData: {name: string, type: TermType, creator: string} & Partial<Term>) {
		this.Extend(initialData);
		//this.createdAt = Date.now();
	}

	_id?: number;
	name: string;
	disambiguation: string;
	type: TermType;
	person?: boolean;
	//name_gerund: string;
	//otherForms: string[];
	//variant_current: number; // server-generated

	// "seed" is the original version; meant to preserve the identity of the entity, even after crowd-based submissions which may change its rendering
	//shortDescription_seed: string;
	// "current" is the version with the highest rating, currently; it is what is shown to users in the UI
	shortDescription_current: string; // server-generated
	// "candidates" are the versions submitted by users for this entity, meant to be the "best rendering" of the seed; they're rated up and down
	//shortDescriptions: string;

	//openAccess: boolean;
	//components: TermComponent[];
	components: TermComponentSet;

	creator: string;
	createdAt: number;
}
//export const termNameFormat = "^[^.#$\\[\\]]+$";
export const Term_nameFormat = `^[a-zA-Z0-9 ,'"%-]+$`;
export const Term_disambiguationFormat = `^[a-zA-Z0-9 ,'"%-]+$`;
//export const Term_shortDescriptionFormat = "^[a-zA-Z ()[],;.!?-+*/]+$";
export const Term_shortDescriptionFormat = `^.+$`;
AddSchema({
	properties: {
		name: {type: "string", pattern: Term_nameFormat},
		disambiguation: {type: "string", pattern: Term_disambiguationFormat},
		type: {$ref: "TermType"},
		person: {type: "boolean"},
		//name_gerund: {type: "string"},
		//otherForms: {items: {type: "string"}},
		//variant_current: {type: "number"},

		shortDescription_current: {type: "string", pattern: Term_shortDescriptionFormat},

		//components: {items: {$ref: "TermComponent"}},
		components: {$ref: "TermComponentSet"},
		
		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["name", "type", /*"variant_current",*/ "shortDescription_current", /*"components",*/ "creator", "createdAt"],
}, "Term");

export enum TermType {
	SpecificEntity = 10,
	EntityType = 20,
	Adjective = 30,
	Action = 40,
	Adverb = 50,
}
AddSchema({oneOf: GetValues_ForSchema(TermType)}, "TermType");

export type TermComponentSet = {[key: number]: boolean};
AddSchema({patternProperties: {"^[0-9]+$": {type: "boolean"}}}, "TermComponentSet");