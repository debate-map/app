import {GetValues_ForSchema} from "../../../Frame/General/Enums";
import {SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";

export enum ImageType {
	Photo = 10,
	Illustration = 20,
}
AddSchema({oneOf: GetValues_ForSchema(ImageType)}, "ImageType");

export function GetNiceNameForImageType(type: ImageType) {
	return ImageType[type].toLowerCase();
}

export class Image {
	constructor(initialData: {name: string, type: ImageType, creator: string} & Partial<Image>) {
		this.sourceChains = [[new Source()]];
		this.Extend(initialData);
		//this.createdAt = Date.now();
	}

	_id: number;
	
	name: string;
	type: ImageType;
	url = "";
	description: string;
	previewWidth: number;

	sourceChains: SourceChain[];

	creator: string;
	createdAt: number;
}
export const Image_namePattern = `^[a-zA-Z0-9 ,'"%\\-()\\/]+$`;
export const Image_urlPattern = `^https?://[^\\s/$.?#]+\\.[^\\s]+\.(jpg|jpeg|gif|png)$`;
AddSchema({
	properties: {
		name: {type: "string", pattern: Image_namePattern},
		type: {$ref: "ImageType"},
		url: {type: "string"},
		description: {type: "string"},
		previewWidth: {type: ["null", "number"]},

		sourceChains: {items: {$ref: "SourceChain"}},

		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["name", "type", "url", "description", "sourceChains", "creator", "createdAt"],
}, "Image");