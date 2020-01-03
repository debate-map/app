import {Source, SourceChain} from "Store/firebase/nodeRevisions/@SourceChain";
import {AddSchema} from "vwebapp-framework";

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