import {AddSchema} from "mobx-firelink";
import {CE} from "js-vextensions";

export class TermAttachment {
	constructor(initialData?: Partial<TermAttachment>) {
		CE(this).VSet(initialData);
	}
	id: string;
}
AddSchema("TermAttachment", {
	properties: {
		id: {type: "string"},
	},
	required: ["id"],
});