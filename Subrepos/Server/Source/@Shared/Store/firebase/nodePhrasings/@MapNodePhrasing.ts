import {AddSchema} from "mobx-firelink";
import {GetValues_ForSchema, CE} from "js-vextensions";

export class MapNodePhrasing {
	constructor(initialData: {node: string} & Partial<MapNodePhrasing>) {
		CE(this).VSet(initialData);
	}

	_key?: string;
	node: string;
	type: MapNodePhrasingType;
	text: string;
	description: string;

	creator: string;
	createdAt: number;
}
AddSchema("MapNodePhrasing", {
	properties: {
		node: {type: "string"},
		type: {$ref: "MapNodePhrasingType"},
		text: {type: "string"},
		description: {type: "string"},

		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["node", "type", "text", "creator", "createdAt"],
});

export enum MapNodePhrasingType {
	Precise = 10,
	Natural = 20,
}
AddSchema("MapNodePhrasingType", {oneOf: GetValues_ForSchema(MapNodePhrasingType)});