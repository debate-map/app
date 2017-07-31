import {GetValues_ForSchema} from "../../../Frame/General/Enums";

export enum MapType {
	Personal = 10,
	Debate = 20,
	Global = 30,
}
export class Map {
	constructor(initialData: {name: string, type: MapType, creator: string} & Partial<Map>) {
		this.Extend(initialData);
		this.createdAt = Date.now();
	}

	_id: number;
	name: string;
	type: MapType;
	rootNode: number;
	defaultExpandDepth = 2;

	creator: string;
	createdAt: number;
}
export const Map_nameFormat = `^[a-zA-Z0-9 ,'"%:.?-]+$`;
AddSchema({
	properties: {
		name: {type: "string", pattern: Map_nameFormat},
		type: {oneOf: GetValues_ForSchema(MapType)},
		rootNode: {type: "number"},
		defaultExpandDepth: {type: "number"},

		creator: {type: "string"},
		createdAt: {type: "number"},
	},
	required: ["name", "type", "rootNode", "creator", "createdAt"],
}, "Map");