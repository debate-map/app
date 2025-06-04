import {AddSchema, Field, MGLClass} from "mobx-graphlink";
import {CE, CreateStringEnum, GetValues, GetValues_ForSchema} from "js-vextensions";
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

	//@Field({$ref: "UUID"}, {opt: true})
	@Field({type: "string"}, {opt: true})
	id: string;

	@Field({type: "string"}, {opt: true})
	creator: string;

	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@Field({type: "string"})
	name: string;

	@Field({$ref: "ShareType"})
	type: ShareType;

	// if map
	// ==========

	@Field({type: "string"}, {opt: true})
	mapID?: string;

	@Field({$ref: "MapView"}, {opt: true})
	mapView?: MapView;
}