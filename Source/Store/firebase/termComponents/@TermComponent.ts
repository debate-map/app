export default class TermComponent {
	constructor(initialData: {text: string} & Partial<TermComponent>) {
		this.Extend(initialData);
		//this.createdAt = Date.now();
	}

	_id?: number;
	text: string;

	parentTerms: ParentTermSet;
}
AddSchema({
	properties: {
		text: {type: "string"},
		parentTerms: {$ref: "ParentTermSet"},
	},
	required: ["text", "parentTerms"],
}, "TermComponent");

/*export type ParentTermSet = {[key: number]: ParentTerm};
AddSchema({patternProperties: {"^[0-9]+$": {$ref: "ParentTerm"}}}, "ParentTermSet");
export type ParentTerm = boolean;
AddSchema({type: "boolean"}, "ParentTerm");*/
export type ParentTermSet = {[key: number]: boolean};
AddSchema({patternProperties: {"^[0-9]+$": {type: "boolean"}}}, "ParentTermSet");