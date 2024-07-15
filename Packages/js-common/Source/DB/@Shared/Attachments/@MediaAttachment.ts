import {AddSchema} from "mobx-graphlink";
import {CE} from "js-vextensions";
import {SourceChain, Source} from "./@SourceChain.js";

export class MediaAttachment {
	constructor(data?: Partial<MediaAttachment>) {
		this.sourceChains = [
			{sources: [new Source()]},
		];
		Object.assign(this, data);
	}

	id: string;
	captured: boolean; // whether the image/video is claimed to be a capturing of real-world footage
	previewWidth?: number; // used to limit the display-width, eg. to keep a tall-but-skinny image from extending multiple screens down
	sourceChains: SourceChain[];
}
AddSchema("MediaAttachment", {
	properties: {
		id: {$ref: "UUID"},
		captured: {type: "boolean"},
		previewWidth: {type: ["number", "null"]},
		sourceChains: {items: {$ref: "SourceChain"}},
	},
	required: ["id"],
});