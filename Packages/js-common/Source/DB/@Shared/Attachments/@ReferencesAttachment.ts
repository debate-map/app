import {AddSchema} from "mobx-graphlink";
import {Source, SourceChain} from "./@SourceChain.js";

export class ReferencesAttachment {
	constructor(data?: Partial<ReferencesAttachment>) {
		this.sourceChains = [
			{sources: [new Source()]},
		];
		Object.assign(this, data);
	}

	sourceChains: SourceChain[];
}
AddSchema("ReferencesAttachment", {
	properties: {
		sourceChains: {items: {$ref: "SourceChain"}},
	},
	required: ["sourceChains"],
});