import {CE} from "js-vextensions";
import {Field, MGLClass} from "mobx-graphlink";
import {ChildOrdering} from "../nodeRatings.js";
import {ChildLayout} from "../nodes/@NodeRevision.js";

/*export enum MapType {
	private = "private",
	public = "public",
	global = "global",
}*/

// note: DMap = DebateMap (using just "Map" causes ambiguity for vscode's auto-import logic, and causes SWC's minifier to rename the class to `Map1`)
@MGLClass({table: "maps", schemaDeps: ["NodeRevision"]})
export class DMap {
	constructor(initialData: {name: string} & Partial<DMap>) {
		CE(this).VSet(initialData);
		// this.createdAt = Date.now();
		/*if (!("requireMapEditorsCanEdit" in initialData)) {
			this.requireMapEditorsCanEdit = this.type == MapType.private;
		}*/
		/*if (!("nodeDefaults" in initialData)) {
			this.nodeDefaults = NodeRevision_Defaultable_DefaultsForMap();
		}*/
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"})
	accessPolicy: string;

	@Field({type: "string"})
	name: string;

	@Field({type: "string"}, {opt: true})
	note?: string;

	@Field({type: "boolean"}, {opt: true})
	noteInline? = true;

	/*@Field({enum: GetValues(MapType)})
	type: MapType;*/

	@Field({type: "string"}, {opt: true})
	rootNode: string;

	@Field({type: "number"})
	defaultExpandDepth = 2;

	/*@Field({type: "string"}, {opt: true})
	defaultTimelineID: string;*/

	/*@Field({type: "boolean"}, {opt: true})
	requireMapEditorsCanEdit?: boolean;*/

	/*@Field(()=>NewSchema({
		properties: CE(GetSchemaJSON("NodeRevision").properties!).IncludeKeys(...NodeRevision_Defaultable_props),
	}))
	nodeDefaults?: NodeRevision_Defaultable;*/

	@Field({$ref: "UUID"}, {opt: true})
	nodeAccessPolicy?: string;

	/*@Field({$ref: "UUID"})
	nodeAccessPolicy_required = false;*/

	@Field({type: "boolean"}, {opt: true})
	featured?: boolean;

	//@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	@Field({items: {type: "string"}})
	editors: string[];

	@Field({type: "string"}, {opt: true})
	creator: string;

	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@Field({type: "number"}, {opt: true})
	edits: number;

	@Field({type: "number"}, {opt: true})
	editedAt?: number;

	/*@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	layers: {[key: string]: boolean};

	@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	timelines: {[key: string]: boolean};*/

	@Field({$ref: "Map_Extras"})
	extras = new Map_Extras();
}

@MGLClass({
	schemaDeps: ["ToolbarItem"],
}, {additionalProperties: true})
export class Map_Extras {
	constructor(data?: Partial<Map_Extras>) {
		Object.assign(this, data);
	}

	@Field({type: "boolean"}, {opt: true})
	allowSpecialChildLayouts? = false;

	@Field({$ref: "ChildLayout"}, {opt: true})
	defaultChildLayout?: ChildLayout;

	@Field({$ref: "ChildOrdering"}, {opt: true})
	defaultChildOrdering?: ChildOrdering;

	@Field({type: "boolean"}, {opt: true})
	defaultNodeToolbarEnabled? = true;

	@Field({items: {$ref: "ToolbarItem"}}, {opt: true})
	toolbarItems? = [] as ToolbarItem[];
}

export const NodePanel_values = [
	"significance", "neutrality", "truth", "relevance", "impact",
	"definitions",
	"phrasings",
	"discussion",
	"social",
	"tags",
	"details",
	"history",
	"comments",
	"others",
];
export type NodePanel = typeof NodePanel_values[number];
@MGLClass()
export class ToolbarItem {
	@Field({type: "string"})
	panel: NodePanel;
}