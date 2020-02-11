import {AddSchema} from "mobx-firelink";

export class ImageAttachment {
	id: string;
}
AddSchema("ImageAttachment", {
	properties: {
		id: {type: "string"},
	},
	required: ["id"],
});