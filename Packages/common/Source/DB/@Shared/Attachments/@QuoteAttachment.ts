import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";
import {Source, SourceChain} from "./@SourceChain.js";

export class QuoteAttachment {
	constructor() {
		this.sourceChains = [
			{sources: [new Source()]},
		];
	}
	content = "";
	sourceChains: SourceChain[];
}
AddSchema("QuoteAttachment", {
	properties: {
		content: {type: "string"},
		sourceChains: {items: {$ref: "SourceChain"}},
	},
	required: ["content", "sourceChains"],
});