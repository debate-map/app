import {AddSchema, DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";
import {GetValues_ForSchema, CE, CreateStringEnum, GetValues} from "web-vcore/nm/js-vextensions.js";

@MGLClass({table: "nodePhrasings"})
export class MapNodePhrasing {
	constructor(data: Partial<MapNodePhrasing>) {
		CE(this).VSet(data);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({$ref: "UUID"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@DB((t, n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({$ref: "UUID"})
	node: string;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "MapNodePhrasingType"})
	type: MapNodePhrasingType;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	text_base: string;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	text_negation: string;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	text_question?: string;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	description: string;
}

export enum MapNodePhrasingType {
	standard = "standard",
	simple = "simple",
	technical = "technical",
	humor = "humor",
	web = "web",
}
AddSchema("MapNodePhrasingType", {enum: GetValues(MapNodePhrasingType)});