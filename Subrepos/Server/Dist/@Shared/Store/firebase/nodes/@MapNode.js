import { GetValues_ForSchema, CE } from "js-vextensions";
import { AddSchema, GetSchemaJSON, UUID_regex, UUID_regex_partial } from "mobx-firelink";
import { MapNodeType } from "./@MapNodeType";
// these are 22-chars, matching 22-char uuids/slug-ids
export const globalMapID = "GLOBAL_MAP_00000000001";
export const globalRootNodeID = "GLOBAL_ROOT_0000000001";
export var AccessLevel;
(function (AccessLevel) {
    AccessLevel[AccessLevel["Basic"] = 10] = "Basic";
    AccessLevel[AccessLevel["Verified"] = 20] = "Verified";
    AccessLevel[AccessLevel["Mod"] = 30] = "Mod";
    AccessLevel[AccessLevel["Admin"] = 40] = "Admin";
})(AccessLevel || (AccessLevel = {}));
export var ClaimForm;
(function (ClaimForm) {
    ClaimForm[ClaimForm["Base"] = 10] = "Base";
    ClaimForm[ClaimForm["Negation"] = 20] = "Negation";
    ClaimForm[ClaimForm["YesNoQuestion"] = 30] = "YesNoQuestion";
})(ClaimForm || (ClaimForm = {}));
export class MapNode {
    constructor(initialData) {
        CE(this).VSet(initialData);
    }
}
// export const MapNode_id = UUID_regex;
// export const MapNode_chainAfterFormat = "^(\\[start\\]|[0-9]+)$";
AddSchema("MapNode", {
    properties: {
        type: { oneOf: GetValues_ForSchema(MapNodeType) },
        creator: { type: "string" },
        createdAt: { type: "number" },
        rootNodeForMap: { $ref: "UUID" },
        ownerMapID: { $ref: "UUID" },
        currentRevision: { type: "string" },
        parents: { $ref: "ParentSet" },
        children: { $ref: "ChildSet" },
        childrenOrder: { items: { $ref: "UUID" } },
        // talkRoot: {type: "number"},
        multiPremiseArgument: { type: "boolean" },
        layerPlusAnchorParents: { $ref: "LayerPlusAnchorParentSet" },
    },
    required: ["type", "creator", "createdAt", "currentRevision"],
});
AddSchema("MapNode_Partial", (() => {
    const schema = GetSchemaJSON("MapNode");
    // schema.required = (schema.required as string[]).Except('creator', 'createdAt');
    schema.required = ["type"];
    return schema;
})());
export var Polarity;
(function (Polarity) {
    Polarity[Polarity["Supporting"] = 10] = "Supporting";
    Polarity[Polarity["Opposing"] = 20] = "Opposing";
})(Polarity || (Polarity = {}));
AddSchema("ParentSet", { patternProperties: { [UUID_regex]: { $ref: "ParentEntry" } } });
AddSchema("ParentEntry", {
    properties: { _: { type: "boolean" } },
    required: ["_"],
});
AddSchema("ChildSet", { patternProperties: { [UUID_regex]: { $ref: "ChildEntry" } } });
AddSchema("ChildEntry", {
    properties: {
        _: { type: "boolean" },
        form: { oneOf: GetValues_ForSchema(ClaimForm) },
        seriesAnchor: { type: ["null", "boolean"] },
        polarity: { oneOf: GetValues_ForSchema(Polarity) },
    },
    required: ["_"],
});
AddSchema("LayerPlusAnchorParentSet", { patternProperties: { [`${UUID_regex_partial}\\+${UUID_regex_partial}`]: { type: "boolean" } } });
