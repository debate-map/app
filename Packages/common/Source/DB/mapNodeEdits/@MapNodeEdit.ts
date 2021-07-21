import {CreateStringEnum, GetValues, GetValues_ForSchema} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, MGLClass, DB, Field} from "web-vcore/nm/mobx-graphlink.js";

export enum ChangeType {
	add = "add",
	edit = "edit",
	remove = "remove",
}
AddSchema("ChangeType", {enum: GetValues(ChangeType)});

//@MGLClass({table: "map_nodeEdits"})
@MGLClass({table: "mapNodeEdits"})
export class Map_NodeEdit {
	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true}) // optional during creation
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`maps`).DeferRef())
	@Field({type: "string"})
	map: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
	node: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"})
	time: number;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "ChangeType"})
	type: ChangeType;
}