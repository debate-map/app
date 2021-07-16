import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";
import {GetValues_ForSchema, CE, CreateStringEnum} from "web-vcore/nm/js-vextensions.js";

export class MapNodePhrasing {
	constructor(initialData: {node: string} & Partial<MapNodePhrasing>) {
		CE(this).VSet(initialData);
	}

	id: string;
	creator: string;
	createdAt: number;

	node: string;
	type: MapNodePhrasingType;
	text: string;
	description: string;

}
AddSchema("MapNodePhrasing", {
	properties: {
		id: {$ref: "UUID"},
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
	precise = "precise",
	natural = "natural",
}
AddSchema("MapNodePhrasingType", {oneOf: GetValues_ForSchema(MapNodePhrasingType)});