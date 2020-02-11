import { AddSchema, UUID_regex } from "mobx-firelink";
import { CE } from "js-vextensions";
export class Layer {
    constructor(initialData) {
        CE(this).VSet(initialData);
    }
}
AddSchema("Layer", {
    properties: {
        name: { type: "string" },
        creator: { type: "string" },
        createdAt: { type: "number" },
        mapsWhereEnabled: { patternProperties: { [UUID_regex]: { type: "boolean" } } },
        nodeSubnodes: { patternProperties: { [UUID_regex]: { $ref: "LayerNodeSubnodes" } } },
    },
    required: ["name", "creator", "createdAt"],
});
AddSchema("LayerNodeSubnodes", { patternProperties: { [UUID_regex]: { type: "boolean" } } });
