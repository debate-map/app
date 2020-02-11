import { GetValues_ForSchema, CE } from "js-vextensions";
import { AddSchema, GetSchemaJSON, Schema, UUID_regex } from "mobx-firelink";
import { MapNodeRevision_Defaultable_props, MapNodeRevision_Defaultable_DefaultsForMap } from "../nodes/@MapNodeRevision";
export var MapType;
(function (MapType) {
    MapType[MapType["Private"] = 10] = "Private";
    MapType[MapType["Public"] = 20] = "Public";
    MapType[MapType["Global"] = 30] = "Global";
})(MapType || (MapType = {}));
export class Map {
    constructor(initialData) {
        this.noteInline = true;
        this.defaultExpandDepth = 2;
        CE(this).VSet(initialData);
        // this.createdAt = Date.now();
        if (!("requireMapEditorsCanEdit" in initialData)) {
            this.requireMapEditorsCanEdit = this.type == MapType.Private;
        }
        if (!("nodeDefaults" in initialData)) {
            this.nodeDefaults = MapNodeRevision_Defaultable_DefaultsForMap(this.type);
        }
    }
}
export const Map_namePattern = '^[a-zA-Z0-9 ,\'"%:.?\\-()\\/]+$';
// export const Map_namePattern = '^\\S.*$'; // must start with non-whitespace // todo: probably switch to a more lax pattern like this, eg. so works for other languages
AddSchema("Map", ["MapNodeRevision"], () => ({
    properties: {
        name: { type: "string", pattern: Map_namePattern },
        note: { type: "string" },
        noteInline: { type: "boolean" },
        type: { oneOf: GetValues_ForSchema(MapType) },
        rootNode: { type: "string" },
        defaultExpandDepth: { type: "number" },
        defaultTimelineID: { type: "string" },
        requireMapEditorsCanEdit: { type: "boolean" },
        nodeDefaults: Schema({
            properties: GetSchemaJSON("MapNodeRevision").properties.Including(...MapNodeRevision_Defaultable_props),
        }),
        featured: { type: "boolean" },
        // editors: { patternProperties: { [UUID_regex]: { type: 'boolean' } } },
        editorIDs: { items: { type: "string" } },
        creator: { type: "string" },
        createdAt: { type: "number" },
        edits: { type: "number" },
        editedAt: { type: "number" },
        layers: { patternProperties: { [UUID_regex]: { type: "boolean" } } },
        timelines: { patternProperties: { [UUID_regex]: { type: "boolean" } } },
    },
    required: ["name", "type", "rootNode", "creator", "createdAt"],
}));
