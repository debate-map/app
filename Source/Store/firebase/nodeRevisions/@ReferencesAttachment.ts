import {Source, SourceChain} from "Store/firebase/nodeRevisions/@SourceChain";
import {AddSchema} from "vwebapp-framework";

export class ReferencesAttachment {
	constructor() {
		this.sourceChains = [
			{sources: [new Source()]},
		];
	}
	sourceChains: SourceChain[];
}
AddSchema("ReferencesAttachment", {
	properties: {
		sourceChains: {items: {$ref: "SourceChain"}},
	},
	required: ["sourceChains"],
});