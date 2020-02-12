import { AddSchema } from "mobx-firelink";
import { CE } from "js-vextensions";
export class Rating {
    constructor(initialData) {
        CE(this).VSet(initialData);
    }
}
AddSchema("Rating", {
    properties: {
        node: { type: "string" },
        type: { $ref: "RatingType" },
        user: { type: "string" },
        updated: { type: "number" },
        value: { type: "number" },
    },
    required: ["node", "type", "user", "value"],
});
