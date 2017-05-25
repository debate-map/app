import {GetValues_ForSchema} from "../../../Frame/General/Enums";
import {SourceChain} from "./@SourceChain";

// todo: probably rename to "Quote"
export class ContentNode {
	content = "";
	sourceChains = [new SourceChain()];
}
AddSchema({
	properties: {
		content: {type: "string"},
		sourceChains: {items: {$ref: "SourceChain"}},
	},
	required: ["content", "sourceChains"],
}, "ContentNode");