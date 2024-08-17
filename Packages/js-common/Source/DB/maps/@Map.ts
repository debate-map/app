import {CE} from "js-vextensions";
import {DB, Field, MGLClass} from "mobx-graphlink";
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

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	accessPolicy: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	name: string;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	note?: string;

	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"}, {opt: true})
	noteInline? = true;

	/*@DB((t,n)=>t.text(n))
	@Field({enum: GetValues(MapType)})
	type: MapType;*/

	@DB((t, n)=>t.text(n).references("id").inTable(`nodes`).DeferRef({enforceAtTransactionEnd: true}))
	@Field({type: "string"}, {opt: true})
	rootNode: string;

	@DB((t, n)=>t.integer(n))
	@Field({type: "number"})
	defaultExpandDepth = 2;

	/*@DB((t,n)=>t.text(n))
	@Field({type: "string"}, {opt: true})
	defaultTimelineID: string;*/

	/*@DB((t,n)=>t.boolean(n))
	@Field({type: "boolean"}, {opt: true})
	requireMapEditorsCanEdit?: boolean;*/

	/*@DB((t, n)=>t.jsonb(n).nullable())
	@Field(()=>NewSchema({
		properties: CE(GetSchemaJSON("NodeRevision").properties!).IncludeKeys(...NodeRevision_Defaultable_props),
	}))
	nodeDefaults?: NodeRevision_Defaultable;*/

	@DB((t, n)=>t.text(n).nullable().references("id").inTable(`accessPolicies`).DeferRef())
	@Field({$ref: "UUID"}, {opt: true})
	nodeAccessPolicy?: string;

	/*@DB((t, n)=>t.boolean(n))
	@Field({$ref: "UUID"})
	nodeAccessPolicy_required = false;*/

	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"}, {opt: true})
	featured?: boolean;

	@DB((t, n)=>t.specificType(n, "text[]"))
	//@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	@Field({items: {type: "string"}})
	editors: string[];

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@DB((t, n)=>t.integer(n))
	@Field({type: "number"}, {opt: true})
	edits: number;

	@DB((t, n)=>t.bigInteger(n).nullable())
	@Field({type: "number"}, {opt: true})
	editedAt?: number;

	/*@DB((t,n)=>t.specificType(n, "text[]"))
	@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	layers: {[key: string]: boolean};

	@DB((t,n)=>t.specificType(n, "text[]"))
	@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	timelines: {[key: string]: boolean};*/

	@DB((t, n)=>t.jsonb(n))
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
	"others",
];
export type NodePanel = typeof NodePanel_values[number];
@MGLClass()
export class ToolbarItem {
	@Field({type: "string"})
	panel: NodePanel;
}