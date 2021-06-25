import {GetValues_ForSchema} from "web-vcore/nm/js-vextensions";
import {AddSchema, MGLClass, DB, Field} from "web-vcore/nm/mobx-graphlink";

export enum ChangeType {
	Add = 10,
	Edit = 20,
	Remove = 30,
}
AddSchema("ChangeType", {oneOf: GetValues_ForSchema(ChangeType)});

@MGLClass({table: "map_nodeEdits"})
export class Map_NodeEdit {
	@DB((t,n)=>t.text(n).references("id").inTable(`maps`).DeferRef())
	@Field({type: "string"})
	map: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
	node: string;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"})
	time: number;

	@DB((t,n)=>t.text(n))
	@Field({$ref: "ChangeType"})
	type: ChangeType;
}