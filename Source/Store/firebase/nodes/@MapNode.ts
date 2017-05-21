import V from "../../../Frame/V/V";
import {_Enum, Enum, GetValues, GetValues_ForSchema} from "../../../Frame/General/Enums";
import {MapNodeType, MapNodeType_Info} from "./@MapNodeType";
import {RatingType} from "../nodeRatings/@RatingType";
import {GetParentNode, IsLinkValid, IsNewLinkValid} from "../nodes";
import {PermissionGroupSet} from "../userExtras/@UserExtraInfo";
import {MetaThesis_ThenType, MetaThesisInfo, GetMetaThesisIfTypeDisplayText, MetaThesis_ThenType_Info} from "./@MetaThesisInfo";
import {ContentNode} from "../contentNodes/@ContentNode";
import {Equation} from "./@Equation";

export enum AccessLevel {
	Basic = 10,
	Verified = 20,
	Mod = 30,
	Admin = 40,
}

export enum ThesisType {
	Normal,
	Equation,
	Quote,
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

	creator?: string;
	createdAt: number;
	approved = false;
	accessLevel = AccessLevel.Basic;
	voteLevel = AccessLevel.Basic;

	relative: boolean;
	fontSizeOverride: number;
	widthOverride: number;

	// components (for theses)
	metaThesis: MetaThesisInfo;
	contentNode: ContentNode;
	equation: Equation;

	// averages from server
	/*agrees = 0;
	degree = 0;
	disagrees = 0;
	weight = 0;*/
	
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
		creator: {type: "string"},
		createdAt: {type: "number"},
		approved: {type: "boolean"},
		accessLevel: {oneOf: GetValues_ForSchema(AccessLevel)},
		voteLevel: {oneOf: GetValues_ForSchema(AccessLevel)},
		relative: {type: "boolean"},
		fontSizeOverride: {type: ["null", "number"]},
		widthOverride: {type: ["null", "number"]},

		metaThesis: {$ref: "MetaThesisInfo"},
		contentNode: {$ref: "ContentNode"},
		equation: {$ref: "Equation"},

		parents: {$ref: "ParentSet"},
		children: {$ref: "ChildSet"},
		childrenOrder: {items: {type: "number"}},
		//talkRoot: {type: "number"},
	},
	required: ["type", "creator", "createdAt"],
	allOf: [
		// if not a meta-thesis or contentNode, require "titles" prop
		{
			if: {prohibited: ["metaThesis", "equation", "contentNode"]},
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
}
AddSchema({
	properties: {_: {type: "boolean"}, form: {oneOf: GetValues_ForSchema(ThesisForm)}},
	required: ["_"],
}, "ChildEntry");