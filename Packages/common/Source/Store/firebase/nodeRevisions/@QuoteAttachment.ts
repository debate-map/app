import {AddSchema} from "../../../../Commands/node_modules/mobx-firelink";
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