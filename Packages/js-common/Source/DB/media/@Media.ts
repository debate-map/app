import {GetValues_ForSchema, CE, CreateStringEnum, GetValues} from "js-vextensions";
import {AddSchema, MGLClass, Field} from "mobx-graphlink";

export enum MediaType {
	image = "image",
	video = "video",
}
AddSchema("MediaType", {enum: GetValues(MediaType)});

export function GetNiceNameForMediaType(type: MediaType) {
	return MediaType[type].toLowerCase();
}

export const Media_namePattern = '^[a-zA-Z0-9 ,\'"%\\-()\\/]+$';
//export const Media_urlPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+\\.(jpg|jpeg|gif|png)$";
@MGLClass({table: "medias"})
export class Media {
	constructor(initialData: {name: string, type: MediaType} & Partial<Media>) {
		CE(this).VSet(initialData);
		// this.createdAt = Date.now();
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"})
	accessPolicy: string;

	@Field({type: "string"}, {opt: true})
	creator: string;

	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@Field({type: "string", pattern: Media_namePattern})
	name: string;

	@Field({$ref: "MediaType"})
	type: MediaType;

	//@Field({pattern: Media_urlPattern})
	@Field({type: "string"}) // allow overriding url pattern; it just highlights possible mistakes
	url = "";

	@Field({type: "string"})
	description: string;
}