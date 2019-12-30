import {Source} from "Store/firebase/contentNodes/@SourceChain";
import {AddSchema} from "vwebapp-framework";
import {SourceChain} from "./@SourceChain";

// todo: probably rename to "Quote"
export class ContentNode {
	constructor() {
		this.sourceChains = [
			{sources: [new Source()]},
		];
	}
	content = "";
	sourceChains: SourceChain[];
}
AddSchema("ContentNode", {
	properties: {
		content: {type: "string"},
		sourceChains: {items: {$ref: "SourceChain"}},
	},
	required: ["content", "sourceChains"],
});