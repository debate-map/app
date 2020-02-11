import { AddSchema } from "mobx-firelink";
import { Source } from "./@SourceChain";
export class QuoteAttachment {
    constructor() {
        this.content = "";
        this.sourceChains = [
            { sources: [new Source()] },
        ];
    }
}
AddSchema("QuoteAttachment", {
    properties: {
        content: { type: "string" },
        sourceChains: { items: { $ref: "SourceChain" } },
    },
    required: ["content", "sourceChains"],
});
