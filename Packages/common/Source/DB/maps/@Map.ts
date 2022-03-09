import {CE} from "web-vcore/nm/js-vextensions.js";
import {DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";
import {ChildOrdering} from "../nodeRatings.js";
import {ChildLayout} from "../nodes/@MapNodeRevision.js";

/*export enum MapType {
	private = "private",
	public = "public",
	global = "global",
}*/

//export const Map_namePattern = '^\\S.*$'; // must start with non-whitespace // todo: probably switch to a more lax pattern like this, eg. so works for other languages
export const Map_namePattern = '^[a-zA-Z0-9 ,\'"%:.?\\-()\\/]+$';
@MGLClass({table: "maps", schemaDeps: ["MapNodeRevision"]})
export class Map {
	constructor(initialData: {name: string} & Partial<Map>) {
		CE(this).VSet(initialData);
		// this.createdAt = Date.now();
		/*if (!("requireMapEditorsCanEdit" in initialData)) {
			this.requireMapEditorsCanEdit = this.type == MapType.private;
		}*/
		/*if (!("nodeDefaults" in initialData)) {
			this.nodeDefaults = MapNodeRevision_Defaultable_DefaultsForMap();
		}*/
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	accessPolicy: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string", pattern: Map_namePattern})
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
		properties: CE(GetSchemaJSON("MapNodeRevision").properties!).IncludeKeys(...MapNodeRevision_Defaultable_props),
	}))
	nodeDefaults?: MapNodeRevision_Defaultable;*/

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

@MGLClass()
export class Map_Extras {
	constructor(data?: Partial<Map_Extras>) {
		this.VSet(data);
	}

	@Field({type: "boolean"}, {opt: true})
	allowSpecialChildLayouts? = false;

	@Field({$ref: "ChildLayout"}, {opt: true})
	defaultChildLayout?: ChildLayout;

	@Field({$ref: "ChildOrdering"}, {opt: true})
	defaultChildOrdering?: ChildOrdering;

	@Field({type: "boolean"}, {opt: true})
	defaultNodeToolbarEnabled? = true;
}