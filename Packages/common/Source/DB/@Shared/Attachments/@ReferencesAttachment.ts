import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";
import {Source, SourceChain} from "./@SourceChain.js";

export class ReferencesAttachment {
	constructor(data?: Partial<ReferencesAttachment>) {
		this.sourceChains = [
			{sources: [new Source()]},
		];
		this.VSet(data);
	}

	sourceChains: SourceChain[];
}
AddSchema("ReferencesAttachment", {
	properties: {
		sourceChains: {items: {$ref: "SourceChain"}},
	},
	required: ["sourceChains"],
});