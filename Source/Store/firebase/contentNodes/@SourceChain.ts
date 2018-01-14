import {GetValues_ForSchema} from "../../../Frame/General/Enums";
//export type SourceChain = { [key: number]: Source; };
//export type SourceChainI = {[key: number]: Source;};
//export class SourceChain /*implements SourceChainI*/ {
/*export class SourceChain extends Array {
	[key: number]: Source;
	0 = new Source();
};*/
export type SourceChain = Source[];
//AddSchema({patternProperties: {"^[0-9]+$": {$ref: "Source"}}, minProperties: 1}, "SourceChain");
AddSchema({items: {$ref: "Source"}, minItems: 1}, "SourceChain");

export enum SourceType {
	Speech = 10,
	Writing = 20,
	/*Image = 30,
	Video = 40,*/
	Webpage = 50,
}
AddSchema({oneOf: GetValues_ForSchema(SourceType)}, "SourceType");

export class Source {
	type = SourceType.Writing;
	name: string;
	author: string;
	link: string; // only the "Webpage" SourceType uses this (and this is all it uses atm)
}
AddSchema({
	properties: {
		type: {$ref: "SourceType"},
		name: {pattern: "\\S+"},
		author: {pattern: "\\S+"},
		link: {format: "uri"},
	},
	//required: ["name", "author", "link"],
	/*anyOf: [
		{required: ["name"], prohibited: ["link"]},
		{required: ["author"], prohibited: ["link"]},
		{required: ["link"], prohibited: ["name", "author"]}
	],*/
	allOf: [
		{
			if: {
				properties: {
					type: {enum: [SourceType.Writing, SourceType.Speech]},
				}
			},
			then: {
				anyOf: [{required: ["name"]}, {required: ["author"]}],
				prohibited: ["link"],
			},
			//else: {prohibited: ["name", "author", "link"]},
		},
		{
			if: {
				properties: {
					type: {const: SourceType.Webpage},
				}
			},
			then: {
				required: ["link"],
				prohibited: ["name", "author"],
			},
			//else: {prohibited: ["name", "author", "link"]},
		},
	],
}, "Source");