import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";

export class TermAttachment {
	constructor(initialData?: Partial<TermAttachment>) {
		CE(this).VSet(initialData);
	}
	id: string;
}
AddSchema("TermAttachment", {
	properties: {
		id: {$ref: "UUID"},
	},
	required: ["id"],
});