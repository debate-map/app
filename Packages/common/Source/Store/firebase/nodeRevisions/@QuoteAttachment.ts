import {AddSchema} from "web-vcore/nm/mobx-graphlink";
import {Source, SourceChain} from "./@SourceChain";

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