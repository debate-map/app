import {AddSchema} from '../../../Server/Server';
import V from "../../../Frame/V/V";
import {GetValues_ForSchema} from '../../../Frame/General/Enums';
import {MapNodeType} from './@MapNodeType';
import {RatingType} from "../nodeRatings/@RatingType";
import {GetParentNode, IsLinkValid, IsNewLinkValid} from "../nodes";
import {PermissionGroupSet} from "../userExtras/@UserExtraInfo";
import {MetaThesisInfo} from './@MetaThesisInfo';
import {ContentNode} from '../contentNodes/@ContentNode';
import {Equation} from './@Equation';
import {Image} from '../images/@Image';

export const globalMapID = 1;
export const globalRootNodeID = 1;

export enum AccessLevel {
	Basic = 10,
	Verified = 20, // for accounts we're pretty sure are legitimate (an actual person's only account)
	Mod = 30,
	Admin = 40,
}

export enum ThesisType {
	Normal = 10,
	MetaThesis = 20,
	Equation = 30,
	Quote = 40,
	Image = 50,
}
export enum ThesisForm {
	Base = 10,
	Negation = 20,
	YesNoQuestion = 30,
}

export class MapNode {
	constructor(initialData: {type: MapNodeType, creator: string} & Partial<MapNode>) {
		this.Extend(initialData);
		this.createdAt = Date.now();
	}

	_id?: number;
	type?: MapNodeType;
	titles: {[key: string]: string};
	note: string;

	creator?: string;
	createdAt: number;
	//updatedAt: number;
	approved = false;
	// only applied client-side; would need to be in protected branch of tree (or use a long, random, and unreferenced node-id) to be "actually" inaccessible
	accessLevel = AccessLevel.Basic;
	//voteLevel = AccessLevel.Basic;

	relative: boolean;
	fontSizeOverride: number;
	widthOverride: number;

	// components (for theses)
	metaThesis: MetaThesisInfo;
	equation: Equation;
	contentNode: ContentNode;
	image: ImageAttachment;
	
	parents: ParentSet;
	children: ChildSet;
	childrenOrder: number[];
	//talkRoot: number;
}
export const MapNode_id = "^[0-9]+$";
//export const MapNode_chainAfterFormat = "^(\\[start\\]|[0-9]+)$";
AddSchema({
	properties: {
		type: {oneOf: GetValues_ForSchema(MapNodeType)},
		titles: {
			properties: {
				base: {type: "string"}, negation: {type: "string"}, yesNoQuestion: {type: "string"},
			},
			//required: ["base", "negation", "yesNoQuestion"],
		},
		note: {type: ["null", "string"]}, // add null-type, for later when the payload-validation schema is derived from the main schema
		creator: {type: "string"},
		createdAt: {type: "number"},
		approved: {type: "boolean"},
		accessLevel: {oneOf: GetValues_ForSchema(AccessLevel).concat({const: null})},
		voteLevel: {oneOf: GetValues_ForSchema(AccessLevel).concat({const: null})}, // not currently used

		relative: {type: "boolean"},
		fontSizeOverride: {type: ["null", "number"]},
		widthOverride: {type: ["null", "number"]},

		metaThesis: {$ref: "MetaThesisInfo"},
		equation: {$ref: "Equation"},
		contentNode: {$ref: "ContentNode"},
		image: {$ref: "ImageAttachment"},

		parents: {$ref: "ParentSet"},
		children: {$ref: "ChildSet"},
		childrenOrder: {items: {type: "number"}},
		//talkRoot: {type: "number"},
	},
	required: ["type", "creator", "createdAt"],
	allOf: [
		// if not a meta-thesis or contentNode, require "titles" prop
		{
			if: {prohibited: ["metaThesis", "equation", "contentNode", "image"]},
			then: {required: ["titles"]},
		},
		// if an argument, require "childrenOrder" prop
		{
			if: {
				properties: {
					type: {oneOf: [{const: MapNodeType.SupportingArgument}, {const: MapNodeType.OpposingArgument}]},
				}
			},
			then: {required: ["childrenOrder"]},
			else: {prohibited: ["childrenOrder"]}
		}
	],
}, "MapNode");

// helpers
//export type MapNodeEnhanced = MapNode & {finalType: MapNodeType};
// similar to a database entry, after having related data from other tables "joined"
export type MapNodeEnhanced = MapNode & {finalType: MapNodeType, link: ChildEntry};

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
	form?: ThesisForm;
	seriesAnchor?: boolean;
}
AddSchema({
	properties: {
		_: {type: "boolean"},
		form: {oneOf: GetValues_ForSchema(ThesisForm)},
		seriesAnchor: {type: ["null", "boolean"]},
	},
	required: ["_"],
}, "ChildEntry");

export class ImageAttachment {
	id: number;
}
AddSchema({
	properties: {
		id: {type: "number"},
	},
	required: ["id"],
}, "ImageAttachment");