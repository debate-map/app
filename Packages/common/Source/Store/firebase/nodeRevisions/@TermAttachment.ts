import {AddSchema} from "../../../../Commands/node_modules/mobx-firelink";
import {CE} from "../../../../Commands/node_modules/js-vextensions";

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