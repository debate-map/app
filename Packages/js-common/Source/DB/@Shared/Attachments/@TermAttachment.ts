import {AddSchema} from "mobx-graphlink";
import {CE} from "js-vextensions";

export class TermAttachment {
	constructor(data?: Partial<TermAttachment>) {
		Object.assign(this, data);
	}

	id: string;
}
AddSchema("TermAttachment", {
	properties: {
		id: {$ref: "UUID"},
	},
	required: ["id"],
});