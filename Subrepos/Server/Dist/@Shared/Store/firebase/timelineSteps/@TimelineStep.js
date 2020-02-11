import { AddSchema } from "mobx-firelink";
import { CE } from "js-vextensions";
export class TimelineStep {
    constructor(initialData) {
        CE(this).VSet(initialData);
    }
}
AddSchema("TimelineStep", {
    properties: {
        timelineID: { type: "string" },
        title: { type: "string" },
        groupID: { type: ["number", "null"] },
        videoTime: { type: ["number", "null"] },
        message: { type: "string" },
        nodeReveals: { $ref: "NodeReveal" },
    },
    required: ["timelineID"],
});
export class NodeReveal {
}
AddSchema("NodeReveal", {
    properties: {
        path: { type: "string" },
        show: { type: "boolean" },
        show_revealDepth: { type: "number" },
        hide: { type: "boolean" },
    },
    required: ["path"],
});
