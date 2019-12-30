import {AddSchema} from "vwebapp-framework";
import {UUID_regex} from "Utils/General/KeyGenerator";
import {ObservableMap} from "mobx";

export class TermComponent {
	constructor(initialData: {text: string} & Partial<TermComponent>) {
		this.VSet(initialData);
		// this.createdAt = Date.now();
	}

	_key?: string;
	text: string;

	parentTerms: ParentTermSet;
}
AddSchema("TermComponent", {
	properties: {
		text: {type: "string"},
		parentTerms: {$ref: "ParentTermSet"},
	},
	required: ["text", "parentTerms"],
});

/* export type ParentTermSet = ObservableMap<number, ParentTerm>;
AddSchema({patternProperties: {"^[A-Za-z0-9_-]+$": {$ref: "ParentTerm"}}}, "ParentTermSet");
export type ParentTerm = boolean;
AddSchema({type: "boolean"}, "ParentTerm"); */
export type ParentTermSet = {[key: string]: boolean};
AddSchema("ParentTermSet", {patternProperties: {[UUID_regex]: {type: "boolean"}}});