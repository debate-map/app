export class Term {
	constructor(initialData: {creator: string} & Partial<Term>) {
		this.Extend(initialData);
		this.createdAt = Date.now();
	}

	_id?: number;
	name: string;
	//variant_current: number; // server-generated

	// "seed" is the original version; meant to preserve the identity of the entity, even after crowd-based submissions which may change its rendering
	//shortDescription_seed: string;
	// "current" is the version with the highest rating, currently; it is what is shown to users in the UI
	shortDescription_current: string; // server-generated
	// "candidates" are the versions submitted by users for this entity, meant to be the "best rendering" of the seed; they're rated up and down
	//shortDescriptions: string;

	components: TermComponent[];

	creator: string;
	createdAt: number;
}
AddSchema({
	properties: {
		name: {type: "string"},
		//variant_current: {type: "number"},
		shortDescription_current: {type: "string"},
		components: {items: {$ref: "TermComponent"}},
		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["name", /*"variant_current",*/ "shortDescription_current", /*"components",*/ "creator", "createdAt"],
}, "Term");

export type TermComponentSet = { [key: number]: boolean; };
AddSchema({patternProperties: {"^[0-9]+$": {type: "boolean"}}}, "TermComponentSet");

//export type TermComponentType = "is a {God^1}" | "is a part of" | "has a" | "has property";
export class TermComponent {
	text: string;
}
AddSchema({
	properties: {
		text: {type: "string"},
	},
}, "TermComponent");