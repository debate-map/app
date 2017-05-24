import {GetValues, GetValues_ForSchema} from "../../../Frame/General/Enums";

export class Equation {
	latex: boolean;
	text = "";
	isStep? = true;
	explanation = null as string;
}
AddSchema({
	properties: {
		latex: {type: "boolean"},
		text: {type: "string"},
		isStep: {type: ["null", "boolean"]},
		explanation: {type: ["null", "string"]},
	},
	required: ["text"],
}, "Equation");