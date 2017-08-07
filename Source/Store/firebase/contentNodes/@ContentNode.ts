import {GetValues_ForSchema} from "../../../Frame/General/Enums";
import {SourceChain} from "./@SourceChain";
import {Source} from "Store/firebase/contentNodes/@SourceChain";

// todo: probably rename to "Quote"
export class ContentNode {
	constructor() {
		this.sourceChains = [[new Source()]];
	}
	content = "";
	sourceChains: SourceChain[];
}
AddSchema({
	properties: {
		content: {type: "string"},
		sourceChains: {items: {$ref: "SourceChain"}},
	},
	required: ["content", "sourceChains"],
}, "ContentNode");