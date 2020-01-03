import {AddSchema} from "vwebapp-framework";

export class TermAttachment {
	constructor(initialData?: Partial<TermAttachment>) {
		this.VSet(initialData);
	}
	id: string;
}
AddSchema("TermAttachment", {
	properties: {
		id: {type: "string"},
	},
	required: ["id"],
});