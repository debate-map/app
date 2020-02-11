import { AddSchema } from "mobx-firelink";
import { CE } from "js-vextensions";
export class TermAttachment {
    constructor(initialData) {
        CE(this).VSet(initialData);
    }
}
AddSchema("TermAttachment", {
    properties: {
        id: { type: "string" },
    },
    required: ["id"],
});
