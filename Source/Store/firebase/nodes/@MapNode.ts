import {AddSchema} from '../../../Server/Server';
import {GetValues_ForSchema} from '../../../Frame/General/Enums';
import {MapNodeType} from './@MapNodeType';
import {RatingType} from "../nodeRatings/@RatingType";
import {GetParentNode, IsLinkValid, IsNewLinkValid} from "../nodes";
import {PermissionGroupSet} from "../userExtras/@UserExtraInfo";
import {ImpactPremiseInfo} from './@ImpactPremiseInfo';
import {ContentNode} from '../contentNodes/@ContentNode';
import {Equation} from './@Equation';
import {Image} from '../images/@Image';
import {MapNodeRevision} from "./@MapNodeRevision";

export const globalMapID = 1;
export const globalRootNodeID = 1;

export enum AccessLevel {
	Basic = 10,
	Verified = 20, // for accounts we're pretty sure are legitimate (an actual person's only account)
	Mod = 30,
	Admin = 40,
}

export enum ClaimType {
	Normal = 10,
	ImpactPremise = 20,
	Equation = 30,
	Quote = 40,
	Image = 50,
}
export enum ClaimForm {
	Base = 10,
	Negation = 20,
	YesNoQuestion = 30,
}

export class MapNode {
	constructor(initialData: {type: MapNodeType} & Partial<MapNode>) {
		this.Extend(initialData);
	}

	_id?: number;
	type?: MapNodeType;
	creator?: string;
	createdAt: number;

	currentRevision: number;
	
	parents: ParentSet;
	children: ChildSet;
	childrenOrder: number[];
	//talkRoot: number;

	layerPlusAnchorParents: LayerPlusAnchorParentSet;
}
export const MapNode_id = "^[0-9]+$";
//export const MapNode_chainAfterFormat = "^(\\[start\\]|[0-9]+)$";
AddSchema({
	properties: {
		type: {oneOf: GetValues_ForSchema(MapNodeType)},
		creator: {type: "string"},
		createdAt: {type: "number"},

		parents: {$ref: "ParentSet"},
		children: {$ref: "ChildSet"},
		childrenOrder: {items: {type: "number"}},
		//talkRoot: {type: "number"},

		layerPlusAnchorParents: {$ref: "LayerPlusAnchorParentSet"},
	},
	required: ["type", "creator", "createdAt"],
	allOf: [
		// if an argument, require "childrenOrder" prop
		{
			if: {
				properties: {
					type: {oneOf: [{const: MapNodeType.Argument}, {const: MapNodeType.Argument}]},
				}
			},
			then: {required: ["childrenOrder"]},
			else: {prohibited: ["childrenOrder"]}
		}
	],
}, "MapNode");

// helpers
//export type MapNodeL2 = MapNode & {finalType: MapNodeType};
// similar to a database entry, after having related data from other tables "joined"
export interface MapNodeL2 extends MapNode {
	current: MapNodeRevision;
}
export interface MapNodeL3 extends MapNodeL2 {
	finalPolarity: Polarity;
	link: ChildEntry;
}

export enum Polarity {
	Supporting = 10,
	Opposing = 20,
}

// regular parents
// ==========

export type ParentSet = { [key: number]: ParentEntry; };
AddSchema({patternProperties: {"^[0-9]+$": {$ref: "ParentEntry"}}}, "ParentSet");
export type ParentEntry = { _: boolean; }
AddSchema({
	properties: {_: {type: "boolean"}},
	required: ["_"],
}, "ParentEntry");

export type ChildSet = { [key: number]: ChildEntry; };
AddSchema({patternProperties: {"^[0-9]+$": {$ref: "ChildEntry"}}}, "ChildSet");
export type ChildEntry = {
	_: boolean;
	form?: ClaimForm;
	seriesAnchor?: boolean;
	polarity?: Polarity;
}
AddSchema({
	properties: {
		_: {type: "boolean"},
		form: {oneOf: GetValues_ForSchema(ClaimForm)},
		seriesAnchor: {type: ["null", "boolean"]},
	},
	required: ["_"],
}, "ChildEntry");

// layer+anchor parents
// ==========

export type LayerPlusAnchorParentSet = { [key: string]: boolean; };
AddSchema({patternProperties: {"^[0-9_]+$": {type: "boolean"}}}, "LayerPlusAnchorParentSet");

// others
// ==========

export class ImageAttachment {
	id: number;
}
AddSchema({
	properties: {
		id: {type: "number"},
	},
	required: ["id"],
}, "ImageAttachment");