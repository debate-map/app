import {GetValues_ForSchema} from "../../../Frame/General/Enums";

export class Image {
	url = "";
}
AddSchema({
	properties: {
		url: {type: "string"},
	},
	required: ["url", "sourceChains"],
}, "Image");