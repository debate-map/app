import {AddSchema} from "web-vcore/nm/mobx-graphlink";
import {GetValues_ForSchema, CE} from "web-vcore/nm/js-vextensions";

export class MapNodePhrasing {
	constructor(initialData: {node: string} & Partial<MapNodePhrasing>) {
		CE(this).VSet(initialData);
	}

	_key?: string;
	creator: string;
	createdAt: number;

	node: string;
	type: MapNodePhrasingType;
	text: string;
	description: string;

}
AddSchema("MapNodePhrasing", {
	properties: {
		creator: {type: "string"},
		createdAt: {type: "number"},

		node: {type: "string"},
		type: {$ref: "MapNodePhrasingType"},
		text: {type: "string"},
		description: {type: "string"},
	},
	required: ["creator", "createdAt", "node", "type", "text"],
});

export enum MapNodePhrasingType {
	Precise = 10,
	Natural = 20,
}
AddSchema("MapNodePhrasingType", {oneOf: GetValues_ForSchema(MapNodePhrasingType)});