import {GetValues_ForSchema, CE, CreateStringEnum, GetValues} from "js-vextensions";
import {AddSchema, MGLClass, DB, Field} from "mobx-graphlink";

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

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	accessPolicy: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@DB((t, n)=>t.text(n))
	@Field({type: "string", pattern: Media_namePattern})
	name: string;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "MediaType"})
	type: MediaType;

	@DB((t, n)=>t.text(n))
	//@Field({pattern: Media_urlPattern})
	@Field({type: "string"}) // allow overriding url pattern; it just highlights possible mistakes
	url = "";

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	description: string;
}