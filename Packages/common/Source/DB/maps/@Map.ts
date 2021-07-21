import {CE} from "web-vcore/nm/js-vextensions.js";
import {DB, Field, GetSchemaJSON, MGLClass, NewSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapNodeRevision_Defaultable, MapNodeRevision_Defaultable_DefaultsForMap, MapNodeRevision_Defaultable_props} from "../nodes/@MapNodeRevision.js";

/*export enum MapType {
	private = "private",
	public = "public",
	global = "global",
}*/

//export const Map_namePattern = '^\\S.*$'; // must start with non-whitespace // todo: probably switch to a more lax pattern like this, eg. so works for other languages
export const Map_namePattern = '^[a-zA-Z0-9 ,\'"%:.?\\-()\\/]+$';
@MGLClass({table: "maps", schemaDeps: ["MapNodeRevision"]})
export class Map {
	constructor(initialData: {name: string, creator: string} & Partial<Map>) {
		CE(this).VSet(initialData);
		// this.createdAt = Date.now();
		/*if (!("requireMapEditorsCanEdit" in initialData)) {
			this.requireMapEditorsCanEdit = this.type == MapType.private;
		}*/
		if (!("nodeDefaults" in initialData)) {
			this.nodeDefaults = MapNodeRevision_Defaultable_DefaultsForMap();
		}
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true}) // optional during creation
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

	@DB((t, n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
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

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field(()=>NewSchema({
		properties: CE(GetSchemaJSON("MapNodeRevision").properties!).Including(...MapNodeRevision_Defaultable_props),
	}))
	nodeDefaults?: MapNodeRevision_Defaultable;

	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"}, {opt: true})
	featured?: boolean;

	@DB((t, n)=>t.specificType(n, "text[]"))
	//@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	@Field({items: {type: "string"}})
	editors: string[];

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"})
	createdAt: number;

	@DB((t, n)=>t.integer(n))
	@Field({type: "number"})
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
}