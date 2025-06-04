import {CreateStringEnum, GetValues, GetValues_ForSchema} from "js-vextensions";
import {AddSchema, MGLClass, Field} from "mobx-graphlink";

export enum ChangeType {
	add = "add",
	edit = "edit",
	remove = "remove",
}
AddSchema("ChangeType", {enum: GetValues(ChangeType)});

// this is called "MapNodeEdit" rather than just "NodeEdit", due to it always being a node edit in the context of a map
//@MGLClass({table: "map_nodeEdits"})
@MGLClass({table: "mapNodeEdits"})
export class MapNodeEdit {
	constructor(data?: Partial<MapNodeEdit>) {
		Object.assign(this, data);
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"})
	map: string;

	@Field({type: "string"})
	node: string;

	@Field({type: "number"})
	time: number;

	@Field({$ref: "ChangeType"})
	type: ChangeType;

	@Field({items: {type: "string"}})
	c_accessPolicyTargets: string[]; // format is: `${policyId}:${apTable}`
}