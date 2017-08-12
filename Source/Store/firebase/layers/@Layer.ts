export class Layer {
	constructor(initialData: {name: string, creator: string} & Partial<Layer>) {
		this.Extend(initialData);
	}

	_id: number;
	name: string;
	creator: string;
	createdAt: number;

	mapsWhereEnabled: {[key: number]: boolean};
	nodeSubnodes: {[key: number]: LayerNodeSubnodes}; // key: node-id
}
AddSchema({
	properties: {
		name: {type: "string"},
		creator: {type: "string"},
		createdAt: {type: "number"},

		mapsWhereEnabled: {patternProperties: {"^[0-9]+$": {type: "boolean"}}},
		nodeSubnodes: {patternProperties: {"^[0-9]+$": {$ref: "LayerNodeSubnodes"}}},
	},
	required: ["name", "creator", "createdAt"],
}, "Layer");

export type LayerNodeSubnodes = {[key: number]: boolean}; // key: subnode-id
AddSchema({patternProperties: {"^[0-9]+$": {type: "boolean"}}}, "LayerNodeSubnodes");