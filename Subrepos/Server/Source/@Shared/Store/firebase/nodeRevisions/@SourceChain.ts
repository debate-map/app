import {GetValues_ForSchema, Assert} from "js-vextensions";
import {AddSchema} from "mobx-firelink";

// export type SourceChain = { [key: number]: Source; };
// export type SourceChainI = {[key: number]: Source;};
// export class SourceChain /*implements SourceChainI*/ {
/* export class SourceChain extends Array {
	[key: number]: Source;
	0 = new Source();
}; */
export class SourceChain {
	constructor(sources: Source[] = []) {
		this.sources = sources;
	}
	sources: Source[];
}
// AddSchema({patternProperties: {"^[A-Za-z0-9_-]+$": {$ref: "Source"}}, minProperties: 1}, "SourceChain");
AddSchema("SourceChain", {
	properties: {
		sources: {items: {$ref: "Source"}, minItems: 1},
	},
	required: ["sources"],
});

export enum SourceType {
	Speech = 10,
	Writing = 20,
	/* Image = 30,
	Video = 40, */
	Webpage = 50,
}
AddSchema("SourceType", {oneOf: GetValues_ForSchema(SourceType)});

export const Source_linkURLPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+$";
export class Source {
	type = SourceType.Webpage;
	name: string;
	author: string;
	link: string; // only the "Webpage" SourceType uses this (and this is all it uses atm)
}
AddSchema("Source", {
	properties: {
		type: {$ref: "SourceType"},
		name: {pattern: "\\S.*"},
		author: {pattern: "\\S.*"},
		link: {type: "string"}, // allow overriding url pattern; it just highlights possible mistakes
		// link: { format: 'uri' },
		// link: { pattern: Source_linkURLPattern },
	},
	// required: ["name", "author", "link"],
	/* anyOf: [
		{required: ["name"], prohibited: ["link"]},
		{required: ["author"], prohibited: ["link"]},
		{required: ["link"], prohibited: ["name", "author"]}
	], */
	allOf: [
		{
			if: {
				properties: {
					type: {enum: [SourceType.Writing, SourceType.Speech]},
				},
			},
			then: {
				anyOf: [{required: ["name"]}, {required: ["author"]}],
				prohibited: ["link"],
			},
			// else: {prohibited: ["name", "author", "link"]},
		},
		{
			if: {
				properties: {
					type: {const: SourceType.Webpage},
				},
			},
			then: {
				required: ["link"],
				prohibited: ["name", "author"],
			},
			// else: {prohibited: ["name", "author", "link"]},
		},
	],
});

export function GetSourceNamePlaceholderText(sourceType: SourceType) {
	if (sourceType == SourceType.Speech) return "speech name";
	if (sourceType == SourceType.Writing) return "book/document name";
	// if (sourceType == SourceType.Webpage) return "(webpage name)";
	Assert(false);
}
export function GetSourceAuthorPlaceholderText(sourceType: SourceType) {
	if (sourceType == SourceType.Speech) return "speaker";
	if (sourceType == SourceType.Writing) return "book/document author";
	// if (sourceType == SourceType.Webpage) return "(webpage name)";
	Assert(false);
}