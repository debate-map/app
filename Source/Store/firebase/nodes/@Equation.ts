import {GetValues, GetValues_ForSchema} from "../../../Frame/General/Enums";

export class Equation {
	text = "";
	explanation = null as string;
}
AddSchema({
	properties: {
		text: {type: "string"},
		explanation: {type: ["null", "string"]},
	},
	required: ["text"],
}, "Equation");