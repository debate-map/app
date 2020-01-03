import {SourceChain, Source} from "Store/firebase/nodeRevisions/@SourceChain";
import {GetValues_ForSchema} from "js-vextensions";
import {AddSchema} from "vwebapp-framework";

export enum ImageType {
	Photo = 10,
	Illustration = 20,
}
AddSchema("ImageType", {oneOf: GetValues_ForSchema(ImageType)});

export function GetNiceNameForImageType(type: ImageType) {
	return ImageType[type].toLowerCase();
}

export class Image {
	constructor(initialData: {name: string, type: ImageType, creator: string} & Partial<Image>) {
		this.sourceChains = [
			{sources: [new Source()]},
		];
		this.VSet(initialData);
		// this.createdAt = Date.now();
	}

	_key: string;

	name: string;
	type: ImageType;
	url = "";
	description: string;
	previewWidth: number;

	sourceChains: SourceChain[];

	creator: string;
	createdAt: number;
}
export const Image_namePattern = '^[a-zA-Z0-9 ,\'"%\\-()\\/]+$';
export const Image_urlPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+\\.(jpg|jpeg|gif|png)$";
AddSchema("Image", {
	properties: {
		name: {type: "string", pattern: Image_namePattern},
		type: {$ref: "ImageType"},
		// url: { pattern: Image_urlPattern },
		url: {type: "string"}, // allow overriding url pattern; it just highlights possible mistakes
		description: {type: "string"},
		previewWidth: {type: ["number", "null"]},

		sourceChains: {items: {$ref: "SourceChain"}},

		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["name", "type", "url", "description", "sourceChains", "creator", "createdAt"],
});