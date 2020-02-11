import { GetValues_ForSchema, CE } from "js-vextensions";
import { AddSchema, GetSchemaJSON } from "mobx-firelink";
import { MapType } from "../maps/@Map";
import { AccessLevel } from "./@MapNode";
export const TitleKey_values = ["base", "negation", "yesNoQuestion"];
export class TitlesMap {
}
AddSchema("TitlesMap", {
    properties: {
        base: { type: "string" },
        negation: { type: "string" },
        yesNoQuestion: { type: "string" },
        // allTerms: { items: { type: 'string' } },
        allTerms: { type: "object" },
    },
});
export var PermissionInfoType;
(function (PermissionInfoType) {
    PermissionInfoType[PermissionInfoType["Creator"] = 10] = "Creator";
    PermissionInfoType[PermissionInfoType["MapEditors"] = 20] = "MapEditors";
    PermissionInfoType[PermissionInfoType["Anyone"] = 30] = "Anyone";
})(PermissionInfoType || (PermissionInfoType = {}));
export class PermissionInfo {
    constructor(initialData) {
        CE(this).VSet(initialData);
    }
}
AddSchema("PermissionInfo", {
    properties: {
        type: { oneOf: GetValues_ForSchema(PermissionInfoType) },
        mapID: { type: "string" },
    },
    required: ["type"],
});
export const MapNodeRevision_Defaultable_props = ["accessLevel", "votingDisabled", "permission_edit", "permission_contribute"];
export function MapNodeRevision_Defaultable_DefaultsForMap(mapType) {
    return {
        accessLevel: AccessLevel.Basic,
        votingDisabled: false,
        permission_edit: new PermissionInfo({ type: mapType == MapType.Private ? PermissionInfoType.MapEditors : PermissionInfoType.Creator }),
        permission_contribute: new PermissionInfo({ type: mapType == MapType.Private ? PermissionInfoType.MapEditors : PermissionInfoType.Anyone }),
    };
}
export class MapNodeRevision {
    constructor(initialData) {
        // updatedAt: number;
        // approved = false;
        // text
        this.titles = { base: "" };
        // permissions
        // only applied client-side; would need to be in protected branch of tree (or use a long, random, and unreferenced node-id) to be "actually" inaccessible
        this.accessLevel = AccessLevel.Basic;
        this.permission_edit = new PermissionInfo({ type: PermissionInfoType.Creator });
        this.permission_contribute = new PermissionInfo({ type: PermissionInfoType.Anyone });
        CE(this).VSet(initialData);
    }
}
// export const MapNodeRevision_titlePattern = `(^\\S$)|(^\\S.*\\S$)`; // must start and end with non-whitespace
export const MapNodeRevision_titlePattern = "^\\S.*$"; // must start with non-whitespace
AddSchema("MapNodeRevision", {
    properties: {
        node: { type: "string" },
        creator: { type: "string" },
        createdAt: { type: "number" },
        //approved: {type: "boolean"},
        // text
        titles: {
            properties: {
                // base: {pattern: MapNodeRevision_titlePattern}, negation: {pattern: MapNodeRevision_titlePattern}, yesNoQuestion: {pattern: MapNodeRevision_titlePattern},
                base: { type: "string" }, negation: { type: "string" }, yesNoQuestion: { type: "string" },
            },
        },
        note: { type: ["null", "string"] },
        termAttachments: { items: { $ref: "TermAttachment" } },
        argumentType: { $ref: "ArgumentType" },
        // attachment
        equation: { $ref: "EquationAttachment" },
        references: { $ref: "ReferencesAttachment" },
        quote: { $ref: "QuoteAttachment" },
        image: { $ref: "ImageAttachment" },
        // permissions
        accessLevel: { oneOf: GetValues_ForSchema(AccessLevel).concat({ const: null }) },
        votingDisabled: { type: ["null", "boolean"] },
        // voteLevel: { oneOf: GetValues_ForSchema(AccessLevel).concat({ const: null }) }, // not currently used
        permission_edit: { $ref: "PermissionInfo" },
        permission_contribute: { $ref: "PermissionInfo" },
        // others
        fontSizeOverride: { type: ["number", "null"] },
        widthOverride: { type: ["number", "null"] },
    },
    required: ["node", "creator", "createdAt"],
    allOf: [
        // if not an argument or content-node, require "titles" prop
        {
            if: { prohibited: ["argumentType", "equation", "quote", "image"] },
            then: { required: ["titles"] },
        },
    ],
});
AddSchema("MapNodeRevision_Partial", (() => {
    const schema = GetSchemaJSON("MapNodeRevision");
    // schema.required = (schema.required as string[]).Except('creator', 'createdAt');
    schema.required = [];
    return schema;
})());
// argument
// ==========
export var ArgumentType;
(function (ArgumentType) {
    ArgumentType[ArgumentType["Any"] = 10] = "Any";
    ArgumentType[ArgumentType["AnyTwo"] = 15] = "AnyTwo";
    ArgumentType[ArgumentType["All"] = 20] = "All";
})(ArgumentType || (ArgumentType = {}));
AddSchema("ArgumentType", { oneOf: GetValues_ForSchema(ArgumentType) });
export function GetArgumentTypeDisplayText(type) {
    return { Any: "any", AnyTwo: "any two", All: "all" }[ArgumentType[type]];
}
