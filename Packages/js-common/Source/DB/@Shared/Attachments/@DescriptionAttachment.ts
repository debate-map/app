import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";

export class DescriptionAttachment {
	constructor(data?: Partial<DescriptionAttachment>) {
		Object.assign(this, data);
	}

	text = "";
}
AddSchema("DescriptionAttachment", {
	properties: {
		text: {type: "string"},
	},
	required: ["text"],
});