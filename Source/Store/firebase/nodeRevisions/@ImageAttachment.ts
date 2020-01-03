import {AddSchema} from "vwebapp-framework";

export class ImageAttachment {
	id: string;
}
AddSchema("ImageAttachment", {
	properties: {
		id: {type: "string"},
	},
	required: ["id"],
});