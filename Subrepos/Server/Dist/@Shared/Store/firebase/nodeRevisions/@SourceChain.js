import { GetValues_ForSchema, Assert } from "js-vextensions";
import { AddSchema } from "mobx-firelink";
// export type SourceChain = { [key: number]: Source; };
// export type SourceChainI = {[key: number]: Source;};
// export class SourceChain /*implements SourceChainI*/ {
/* export class SourceChain extends Array {
    [key: number]: Source;
    0 = new Source();
}; */
export class SourceChain {
    constructor(sources = []) {
        this.sources = sources;
    }
}
// AddSchema({patternProperties: {"^[A-Za-z0-9_-]+$": {$ref: "Source"}}, minProperties: 1}, "SourceChain");
AddSchema("SourceChain", {
    properties: {
        sources: { items: { $ref: "Source" }, minItems: 1 },
    },
    required: ["sources"],
});
export var SourceType;
(function (SourceType) {
    SourceType[SourceType["Speech"] = 10] = "Speech";
    SourceType[SourceType["Writing"] = 20] = "Writing";
    /* Image = 30,
    Video = 40, */
    SourceType[SourceType["Webpage"] = 50] = "Webpage";
})(SourceType || (SourceType = {}));
AddSchema("SourceType", { oneOf: GetValues_ForSchema(SourceType) });
export const Source_linkURLPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+$";
export class Source {
    constructor() {
        this.type = SourceType.Webpage;
    }
}
AddSchema("Source", {
    properties: {
        type: { $ref: "SourceType" },
        name: { pattern: "\\S.*" },
        author: { pattern: "\\S.*" },
        link: { type: "string" },
    },
    // required: ["name", "author", "link"],
    /* anyOf: [
        {required: ["name"], prohibited: ["link"]},
        {required: ["author"], prohibited: ["link"]},
        {required: ["link"], prohibited: ["name", "author"]}
    ], */
    allOf: [
        {
            if: {
                properties: {
                    type: { enum: [SourceType.Writing, SourceType.Speech] },
                },
            },
            then: {
                anyOf: [{ required: ["name"] }, { required: ["author"] }],
                prohibited: ["link"],
            },
        },
        {
            if: {
                properties: {
                    type: { const: SourceType.Webpage },
                },
            },
            then: {
                required: ["link"],
                prohibited: ["name", "author"],
            },
        },
    ],
});
export function GetSourceNamePlaceholderText(sourceType) {
    if (sourceType == SourceType.Speech)
        return "speech name";
    if (sourceType == SourceType.Writing)
        return "book/document name";
    // if (sourceType == SourceType.Webpage) return "(webpage name)";
    Assert(false);
}
export function GetSourceAuthorPlaceholderText(sourceType) {
    if (sourceType == SourceType.Speech)
        return "speaker";
    if (sourceType == SourceType.Writing)
        return "book/document author";
    // if (sourceType == SourceType.Webpage) return "(webpage name)";
    Assert(false);
}
