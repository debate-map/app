import {AddSchema} from "../../../../Commands/node_modules/mobx-firelink";
import {CE, GetValues_ForSchema} from "../../../../Commands/node_modules/js-vextensions";
import {MapView} from "./@MapView";

export enum ShareType {
	Map = 10,
}
AddSchema("ShareType", {oneOf: GetValues_ForSchema(ShareType)});

export class Share {
	constructor(initialData: Partial<Share>) {
		CE(this).VSet(initialData);
	}

	_key: string;
	creator: string;
	createdAt: number;
	name: string;
	type: ShareType;

	// if map
	mapID: string;
	mapView: MapView;
}
AddSchema("Share", {
	properties: {
		creator: {type: "string"},
		createdAt: {type: "number"},
		name: {type: "string"},
		type: {$ref: "ShareType"},

		mapID: {type: "string"},
		mapView: {$ref: "MapView"},
	},
	required: ["creator", "createdAt", "type"],
});