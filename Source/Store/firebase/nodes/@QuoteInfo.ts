export class QuoteInfo {
	author = "";
	text = "";
	sources = {[0]: new Source()} as SourceSet;
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
AddSchema({patternProperties: {"^[0-9]+$": {$ref: "Source"}}, minProperties: 1}, "SourceSet");
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