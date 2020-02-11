import { AddSchema } from "mobx-firelink";
import { CE } from "js-vextensions";
export class Timeline {
    constructor(initialData) {
        CE(this).VSet(initialData);
    }
}
AddSchema("Timeline", {
    properties: {
        mapID: { type: "string" },
        name: { type: "string" },
        creator: { type: "string" },
        createdAt: { type: "number" },
        videoID: { type: ["string", "null"] },
        videoStartTime: { type: ["number", "null"] },
        videoHeightVSWidthPercent: { type: "number" },
        steps: { items: { type: "string" } },
    },
    required: ["mapID", "name", "creator", "createdAt"],
});
