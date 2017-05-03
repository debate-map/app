import {GetValues_ForSchema} from "../../../Frame/General/Enums";

export class ContentNode {
	content = "";
	sourceChains = [new SourceChain()];
}
AddSchema({
	properties: {
		content: {type: "string"},
		sourceChains: {items: {$ref: "SourceChain"}},
	},
	required: ["content", "sourceChains"],
}, "ContentNode");

//export type SourceChain = { [key: number]: Source; };
//export type SourceChainI = {[key: number]: Source;};
//export class SourceChain /*implements SourceChainI*/ {
export class SourceChain extends Array {
	[key: number]: Source;
	0 = new Source();
};
//AddSchema({patternProperties: {"^[0-9]+$": {$ref: "Source"}}, minProperties: 1}, "SourceChain");
AddSchema({items: {$ref: "Source"}, minItems: 1}, "SourceChain");

export class Source {
	type = SourceType.Writing;
	name: string;
	author: string;
	link: string; // only the "Webpage" SourceType uses this (and this is all it uses atm)
}
AddSchema({
	properties: {
		type: {$ref: "SourceType"},
		name: {type: "string"},
		author: {type: "string"},
		link: {format: "uri"},
	},
	//required: ["name", "author", "link"],
	anyOf: [
		{required: ["name"], prohibited: ["link"]},
		{required: ["author"], prohibited: ["link"]},
		{required: ["link"], prohibited: ["name", "author"]}
	],
}, "Source");

export enum SourceType {
	Speech = 10,
	Writing = 20,
	/*Image = 30,
	Video = 40,*/
	Webpage = 50,
}
AddSchema({oneOf: GetValues_ForSchema(SourceType)}, "SourceType");