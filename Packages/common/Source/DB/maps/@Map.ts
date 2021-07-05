import {GetValues_ForSchema, CE, CreateStringEnum} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, MGLClass, DB, Field, GetSchemaJSON, Schema, UUID_regex} from "web-vcore/nm/mobx-graphlink.js";
import {ObservableMap} from "web-vcore/nm/mobx.js";
import {MapNodeRevision_Defaultable, MapNodeRevision_Defaultable_props, MapNodeRevision_Defaultable_DefaultsForMap} from "../nodes/@MapNodeRevision.js";

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

	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;
	
	@DB((t,n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"}, {req: true})
	accessPolicy: string;

	@DB((t,n)=>t.text(n))
	@Field({type: "string", pattern: Map_namePattern}, {req: true})
	name: string;

	@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	note?: string;

	@DB((t,n)=>t.boolean(n))
	@Field({type: "boolean"})
	noteInline? = true;

	/*@DB((t,n)=>t.text(n))
	@Field({oneOf: GetValues_ForSchema(MapType)}, {req: true})
	type: MapType;*/

	@DB((t,n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
	rootNode: string;

	@DB((t,n)=>t.integer(n))
	@Field({type: "number"})
	defaultExpandDepth = 2;

	/*@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	defaultTimelineID: string;*/

	/*@DB((t,n)=>t.boolean(n))
	@Field({type: "boolean"})
	requireMapEditorsCanEdit?: boolean;*/

	@DB((t,n)=>t.jsonb(n))
	@Field(()=>Schema({
		properties: CE(GetSchemaJSON("MapNodeRevision").properties).Including(...MapNodeRevision_Defaultable_props),
	}))
	nodeDefaults?: MapNodeRevision_Defaultable;

	@DB((t,n)=>t.boolean(n))
	@Field({type: "boolean"})
	featured?: boolean;

	@DB((t,n)=>t.specificType(n, "text[]").notNullable())
	//@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	@Field({items: {type: "string"}}, {req: true})
	editors: string[];

	@DB((t,n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {req: true})
	creator: string;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"}, {req: true})
	createdAt: number;

	@DB((t,n)=>t.integer(n))
	@Field({type: "number"})
	edits: number;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"})
	editedAt: number;

	/*@DB((t,n)=>t.specificType(n, "text[]"))
	@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	layers: {[key: string]: boolean};

	@DB((t,n)=>t.specificType(n, "text[]"))
	@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	timelines: {[key: string]: boolean};*/
}