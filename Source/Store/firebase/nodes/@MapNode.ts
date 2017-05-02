import V from "../../../Frame/V/V";
import {_Enum, Enum, GetValues, GetValues_ForSchema} from "../../../Frame/General/Enums";
import {MapNodeType, MapNodeType_Info} from "./@MapNodeType";
import {RatingType} from "../nodeRatings/@RatingType";
import {GetParentNode, IsLinkValid, IsNewLinkValid} from "../nodes";
import {PermissionGroupSet} from "../userExtras/@UserExtraInfo";
import {MetaThesis_ThenType, MetaThesisInfo, GetMetaThesisIfTypeDisplayText, MetaThesis_ThenType_Info} from "./@MetaThesisInfo";
import {ContentNode} from "../contentNodes/@ContentNode";

export enum AccessLevel {
	Basic = 10,
	Verified = 20,
	Mod = 30,
	Admin = 40,
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
	contentNode: ContentNode;
	metaThesis: MetaThesisInfo;

	// averages from server
	/*agrees = 0;
	degree = 0;
	disagrees = 0;
	weight = 0;*/
	
	parents: ParentSet;
	children: ChildSet;
	//talkRoot: number;
}
AddSchema({
	properties: {
		type: {
			allOf: [
				{oneOf: GetValues_ForSchema(MapNodeType)},
			],
		},
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
		contentNode: {$ref: "ContentNode"},
		metaThesis: {$ref: "MetaThesisInfo"},
		parents: {$ref: "ParentSet"},
		children: {$ref: "ChildSet"},
		//talkRoot: {type: "number"},
	},
	required: ["type", "creator", "createdAt"],
	// if not a meta-thesis or contentNode, require "titles" prop
	if: {prohibited: ["metaThesis", "contentNode"]},
	then: {required: ["titles"]},
}, "MapNode");

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