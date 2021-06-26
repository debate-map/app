import {GetValues_ForSchema, CE, CreateStringEnum} from "web-vcore/nm/js-vextensions";
import {AddSchema, MGLClass, DB, Field} from "web-vcore/nm/mobx-graphlink";

export const [MediaType] = CreateStringEnum({
	image: 1,
	video: 1,
});
export type MediaType = keyof typeof MediaType;
AddSchema("MediaType", {oneOf: GetValues_ForSchema(MediaType)});

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

	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"}, {req: true})
	accessPolicy: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {req: true})
	creator: string;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"}, {req: true})
	createdAt: number;

	@DB((t,n)=>t.text(n))
	@Field({type: "string", pattern: Media_namePattern}, {req: true})
	name: string;

	@DB((t,n)=>t.text(n))
	@Field({$ref: "MediaType"}, {req: true})
	type: MediaType;

	@DB((t,n)=>t.text(n))
	//@Field({pattern: Media_urlPattern})
	@Field({type: "string"}, {req: true}) // allow overriding url pattern; it just highlights possible mistakes
	url = "";

	@DB((t,n)=>t.text(n))
	@Field({type: "string"}, {req: true})
	description: string;
}