import { AddSchema } from "mobx-firelink";
import { Source } from "./@SourceChain";
export class ReferencesAttachment {
    constructor() {
        this.sourceChains = [
            { sources: [new Source()] },
        ];
    }
}
AddSchema("ReferencesAttachment", {
    properties: {
        sourceChains: { items: { $ref: "SourceChain" } },
    },
    required: ["sourceChains"],
});
