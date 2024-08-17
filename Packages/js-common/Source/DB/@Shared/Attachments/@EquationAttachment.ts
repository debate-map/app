import {AddSchema} from "mobx-graphlink";

export class EquationAttachment {
	constructor(data?: Partial<EquationAttachment>) {
		Object.assign(this, data);
	}

	latex?: boolean;
	text = "";
	isStep? = true;
	explanation = null as string|n;
}
AddSchema("EquationAttachment", {
	properties: {
		latex: {type: "boolean"},
		text: {type: "string"},
		isStep: {type: ["null", "boolean"]},
		explanation: {type: ["null", "string"]},
	},
	required: ["text"],
});