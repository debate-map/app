import {GetValues_ForSchema, CE} from "web-vcore/nm/js-vextensions";
import {AddSchema} from "web-vcore/nm/mobx-graphlink";
import {Source, SourceChain} from "../nodeRevisions/@SourceChain";

export enum MediaType {
	Image = 10,
	Video = 20,
}
AddSchema("MediaType", {oneOf: GetValues_ForSchema(MediaType)});

export function GetNiceNameForMediaType(type: MediaType) {
	return MediaType[type].toLowerCase();
}

export class Media {
	constructor(initialData: {name: string, type: MediaType} & Partial<Media>) {
		CE(this).VSet(initialData);
		// this.createdAt = Date.now();
	}

	_key: string;
	creator: string;
	createdAt: number;

	name: string;
	type: MediaType;
	url = "";
	description: string;

}
export const Media_namePattern = '^[a-zA-Z0-9 ,\'"%\\-()\\/]+$';
//export const Media_urlPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+\\.(jpg|jpeg|gif|png)$";
AddSchema("Media", {
	properties: {
		creator: {type: "string"},
		createdAt: {type: "number"},

		name: {type: "string", pattern: Media_namePattern},
		type: {$ref: "MediaType"},
		// url: { pattern: Media_urlPattern },
		url: {type: "string"}, // allow overriding url pattern; it just highlights possible mistakes
		description: {type: "string"},
	},
	required: ["name", "type", "url", "description", "creator", "createdAt"],
});