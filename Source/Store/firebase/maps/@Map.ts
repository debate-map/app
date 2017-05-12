import {GetValues_ForSchema} from "../../../Frame/General/Enums";
export enum MapType {
	Personal = 10,
	Debate = 20,
	Global = 30,
}
export interface Map {
	_id: number;
	name: string;
	type: MapType;
	rootNode: number;
}
AddSchema({
	properties: {
		name: {type: "string"},
		type: {oneOf: GetValues_ForSchema(MapType)},
		rootNode: {type: "number"},
	},
	required: ["name", "type", "rootNode"],
}, "Map");