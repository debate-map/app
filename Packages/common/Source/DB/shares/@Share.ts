import {AddSchema, DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";
import {CE, CreateStringEnum, GetValues, GetValues_ForSchema} from "web-vcore/nm/js-vextensions.js";
import {MapView} from "./@MapView.js";

export enum ShareType {
	map = "map",
}
AddSchema("ShareType", {enum: GetValues(ShareType)});

@MGLClass({table: "shares"})
export class Share {
	constructor(initialData: Partial<Share>) {
		CE(this).VSet(initialData);
	}

	@DB((t, n)=>t.text(n).primary())
	//@Field({$ref: "UUID"}, {opt: true})
	@Field({type: "string"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	name: string;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "ShareType"})
	type: ShareType;

	// if map
	// ==========

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	mapID?: string;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: "MapView"}, {opt: true})
	mapView?: MapView;
}