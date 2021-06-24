import {AddSchema, DB, MGLClass, Field, UUID_regex} from "web-vcore/nm/mobx-graphlink";
import {ObservableMap} from "web-vcore/nm/mobx";
import {CE} from "web-vcore/nm/js-vextensions";

@MGLClass({table: "layers"})
export class Layer {
	constructor(initialData: {name: string, creator: string} & Partial<Layer>) {
		CE(this).VSet(initialData);
	}

	//@DB((t,n)=>)
	@Field({type: "string"})
	id: string;

	//@DB((t,n)=>)
	@Field({type: "string"}, {req: true})
	name: string;

	//@DB((t,n)=>)
	@Field({type: "string"}, {req: true})
	creator: string;

	//@DB((t,n)=>)
	@Field({type: "number"}, {req: true})
	createdAt: number;

	//@DB((t,n)=>)
	@Field({patternProperties: {[UUID_regex]: {type: "boolean"}}})
	mapsWhereEnabled: ObservableMap<string, boolean>;

	//@DB((t,n)=>)
	@Field({patternProperties: {[UUID_regex]: {$ref: "LayerNodeSubnodes"}}})
	nodeSubnodes: ObservableMap<string, LayerNodeSubnodes>; // key: node-id
}

export type LayerNodeSubnodes = ObservableMap<string, boolean>; // key: subnode-id
AddSchema("LayerNodeSubnodes", {patternProperties: {[UUID_regex]: {type: "boolean"}}});