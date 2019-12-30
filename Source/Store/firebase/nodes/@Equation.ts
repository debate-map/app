import {AddSchema} from "vwebapp-framework";

export class Equation {
	latex: boolean;
	text = "";
	isStep? = true;
	explanation = null as string;
}
AddSchema("Equation", {
	properties: {
		latex: {type: "boolean"},
		text: {type: "string"},
		isStep: {type: ["null", "boolean"]},
		explanation: {type: ["null", "string"]},
	},
	required: ["text"],
});