import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";
import {Source, SourceChain} from "./@SourceChain.js";

export class QuoteAttachment {
	constructor(data?: Partial<QuoteAttachment>) {
		this.sourceChains = [
			{sources: [new Source()]},
		];
		Object.assign(this, data);
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