import {GetValues_ForSchema, CE, CreateStringEnum, GetValues} from "js-vextensions";
import {AddSchema, Field, MGLClass} from "mobx-graphlink";
import {Attachment} from "../../DB.js";
import {MarkerForNonScalarField} from "../../Utils/General/General.js";

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

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"})
	accessPolicy: string;

	@Field({type: "string"}, {opt: true})
	creator: string;

	@Field({type: "number"}, {opt: true})
	createdAt: number;

	//@Field({type: "string", pattern: Term_nameFormat}) // commented atm, since too strict
	@Field({type: "string"})
	name: string;

	@Field({items: {type: "string", pattern: Term_formsEntryFormat}, minItems: 1, uniqueItems: true})
	forms: string[];

	@Field({type: "string", pattern: Term_disambiguationFormat}, {opt: true})
	disambiguation?: string;

	@Field({$ref: "TermType"})
	type: TermType;

	@Field({type: "string", pattern: Term_definitionFormat})
	definition: string;

	@Field({type: "string"}, {opt: true})
	note?: string;

	@Field({items: {$ref: "Attachment"}, ...MarkerForNonScalarField()})
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