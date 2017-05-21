import {GetValues, GetValues_ForSchema} from "../../../Frame/General/Enums";

export class Equation {
	latex: boolean;
	text = "";
	explanation = null as string;
}
AddSchema({
	properties: {
		latex: {type: "boolean"},
		text: {type: "string"},
		explanation: {type: ["null", "string"]},
	},
	required: ["text"],
}, "Equation");