export class QuoteInfo {
	author = "";
	text = "";
	sources = {} as SourceSet;
}
AddSchema({
	properties: {
		author: {type: "string"},
		text: {type: "string"},
		sources: {$ref: "SourceSet"},
	},
	required: ["author", "text", "sources"],
}, "QuoteInfo");

export type SourceSet = { [key: number]: Source; }
AddSchema({patternProperties: {"^[0-9]+$": {$ref: "Source"}}}, "SourceSet");
export class Source {
	name = "";
	link = "";
}
AddSchema({
	properties: {
		name: {type: "string"},
		link: {format: "uri"},
	},
	required: ["name", "link"],
}, "Source");