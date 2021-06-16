import {GetValues_ForSchema, CE} from "../../../../Commands/node_modules/js-vextensions";
import {AddSchema, GetSchemaJSON, Schema, UUID_regex} from "../../../../Commands/node_modules/mobx-firelink";
import {ObservableMap} from "web-vcore/nm/mobx";
import {MapNodeRevision_Defaultable, MapNodeRevision_Defaultable_props, MapNodeRevision_Defaultable_DefaultsForMap} from "../nodes/@MapNodeRevision";

export enum MapType {
	Private = 10,
	Public = 20,
	Global = 30,
}
export enum MapVisibility {
	Visible = 10,
	Unlisted = 20,
	//Hidden = 30, // will make client refuse to load map, for users that aren't on map viewers/editors list [contents still public, but makes outside viewing harder]
}

export class Map {
	constructor(initialData: {name: string, type: MapType, creator: string} & Partial<Map>) {
		CE(this).VSet(initialData);
		// this.createdAt = Date.now();
		if (!("requireMapEditorsCanEdit" in initialData)) {
			this.requireMapEditorsCanEdit = this.type == MapType.Private;
		}
		if (!("nodeDefaults" in initialData)) {
			this.nodeDefaults = MapNodeRevision_Defaultable_DefaultsForMap(this.type);
		}
	}

	_key: string;
	name: string;
	note: string;
	noteInline = true;
	type: MapType;
	rootNode: string;
	visibility: MapVisibility;
	defaultExpandDepth = 2;
	defaultTimelineID: string;
	requireMapEditorsCanEdit: boolean;
	// allowPublicNodes = true; // todo
	nodeDefaults: MapNodeRevision_Defaultable;
	featured: boolean;
	editorIDs: string[];

	creator: string;
	createdAt: number;
	edits: number;
	editedAt: number;

	layers: {[key: string]: boolean};
	timelines: {[key: string]: boolean};
}
export const Map_namePattern = '^[a-zA-Z0-9 ,\'"%:.?\\-()\\/]+$';
// export const Map_namePattern = '^\\S.*$'; // must start with non-whitespace // todo: probably switch to a more lax pattern like this, eg. so works for other languages
AddSchema("Map", ["MapNodeRevision"], ()=>({
	properties: {
		name: {type: "string", pattern: Map_namePattern},
		note: {type: "string"},
		noteInline: {type: "boolean"},
		type: {oneOf: GetValues_ForSchema(MapType)},
		rootNode: {type: "string"},
		visibility: {oneOf: GetValues_ForSchema(MapVisibility)},
		defaultExpandDepth: {type: "number"},
		defaultTimelineID: {type: "string"},
		requireMapEditorsCanEdit: {type: "boolean"},
		nodeDefaults: Schema({
			properties: CE(GetSchemaJSON("MapNodeRevision").properties).Including(...MapNodeRevision_Defaultable_props),
		}),
		featured: {type: "boolean"},
		// editors: { patternProperties: { [UUID_regex]: { type: 'boolean' } } },
		editorIDs: {items: {type: "string"}},

		creator: {type: "string"},
		createdAt: {type: "number"},
		edits: {type: "number"},
		editedAt: {type: "number"},

		layers: {patternProperties: {[UUID_regex]: {type: "boolean"}}},
		timelines: {patternProperties: {[UUID_regex]: {type: "boolean"}}},
	},
	required: ["name", "type", "rootNode", "creator", "createdAt"],
}));