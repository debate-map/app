import {GetValues_ForSchema} from "js-vextensions";
import {AddSchema, GetSchemaJSON} from "vwebapp-framework";
import {QuoteAttachment} from "../nodeRevisions/@QuoteAttachment";
import {MapType} from "../maps/@Map";
import {ImageAttachment} from "../nodeRevisions/@ImageAttachment";
import {AccessLevel} from "./@MapNode";
import {EquationAttachment} from "../nodeRevisions/@EquationAttachment";
import {TermAttachment} from "../nodeRevisions/@TermAttachment";
import {ReferencesAttachment} from "../nodeRevisions/@ReferencesAttachment";

export type TitleKey = "base" | "negation" | "yesNoQuestion";
export const TitleKey_values = ["base", "negation", "yesNoQuestion"];
export class TitlesMap {
	base?: string;
	negation?: string;
	yesNoQuestion?: string;

	// allTerms?: string[];
	// allTerms?: ObservableMap<string, boolean>;
	allTerms?: {[key: string]: boolean};
}
AddSchema("TitlesMap", {
	properties: {
		base: {type: "string"},
		negation: {type: "string"},
		yesNoQuestion: {type: "string"},

		// allTerms: { items: { type: 'string' } },
		allTerms: {type: "object"},
	},
});

export enum PermissionInfoType {
	Creator = 10,
	MapEditors = 20,
	Anyone = 30,
}
export class PermissionInfo {
	constructor(initialData: Partial<PermissionInfo>) {
		this.VSet(initialData);
	}
	type: PermissionInfoType;
}
AddSchema("PermissionInfo", {
	properties: {
		type: {oneOf: GetValues_ForSchema(PermissionInfoType)},
		mapID: {type: "string"},
	},
	required: ["type"],
});

export const MapNodeRevision_Defaultable_props = ["accessLevel", "votingDisabled", "permission_edit", "permission_contribute"] as const;
export type MapNodeRevision_Defaultable = Pick<MapNodeRevision, "accessLevel" | "votingDisabled" | "permission_edit" | "permission_contribute">;
export function MapNodeRevision_Defaultable_DefaultsForMap(mapType: MapType): MapNodeRevision_Defaultable {
	return {
		accessLevel: AccessLevel.Basic,
		votingDisabled: false,
		permission_edit: new PermissionInfo({type: mapType == MapType.Private ? PermissionInfoType.MapEditors : PermissionInfoType.Creator}),
		permission_contribute: new PermissionInfo({type: mapType == MapType.Private ? PermissionInfoType.MapEditors : PermissionInfoType.Anyone}),
	};
}

export class MapNodeRevision {
	constructor(initialData: Partial<MapNodeRevision>) {
		this.VSet(initialData);
	}

	_key?: string;
	node: string; // probably todo: rename to nodeID
	creator?: string; // probably todo: rename to creatorID
	createdAt: number;
	// updatedAt: number;
	// approved = false;

	// text
	titles = {base: ""} as TitlesMap;
	note: string;
	termAttachments: TermAttachment[];
	argumentType: ArgumentType;

	// attachment
	equation: EquationAttachment;
	references: ReferencesAttachment;
	quote: QuoteAttachment;
	image: ImageAttachment;

	// permissions
	// only applied client-side; would need to be in protected branch of tree (or use a long, random, and unreferenced node-id) to be "actually" inaccessible
	accessLevel = AccessLevel.Basic;
	// voteLevel = AccessLevel.Basic;
	votingDisabled: boolean;
	permission_edit = new PermissionInfo({type: PermissionInfoType.Creator});
	permission_contribute = new PermissionInfo({type: PermissionInfoType.Anyone});

	// others
	fontSizeOverride: number;
	widthOverride: number;
}
// export const MapNodeRevision_titlePattern = `(^\\S$)|(^\\S.*\\S$)`; // must start and end with non-whitespace
export const MapNodeRevision_titlePattern = "^\\S.*$"; // must start with non-whitespace
AddSchema("MapNodeRevision", {
	properties: {
		node: {type: "string"},
		creator: {type: "string"},
		createdAt: {type: "number"},
		//approved: {type: "boolean"},

		// text
		titles: {
			properties: {
				// base: {pattern: MapNodeRevision_titlePattern}, negation: {pattern: MapNodeRevision_titlePattern}, yesNoQuestion: {pattern: MapNodeRevision_titlePattern},
				base: {type: "string"}, negation: {type: "string"}, yesNoQuestion: {type: "string"},
			},
			// required: ["base", "negation", "yesNoQuestion"],
		},
		note: {type: ["null", "string"]}, // add null-type, for later when the payload-validation schema is derived from the main schema
		termAttachments: {items: {$ref: "TermAttachment"}},
		argumentType: {$ref: "ArgumentType"},

		// attachment
		equation: {$ref: "EquationAttachment"},
		references: {$ref: "ReferencesAttachment"},
		quote: {$ref: "QuoteAttachment"},
		image: {$ref: "ImageAttachment"},

		// permissions
		accessLevel: {oneOf: GetValues_ForSchema(AccessLevel).concat({const: null})},
		votingDisabled: {type: ["null", "boolean"]},
		// voteLevel: { oneOf: GetValues_ForSchema(AccessLevel).concat({ const: null }) }, // not currently used
		permission_edit: {$ref: "PermissionInfo"},
		permission_contribute: {$ref: "PermissionInfo"},

		// others
		fontSizeOverride: {type: ["number", "null"]},
		widthOverride: {type: ["number", "null"]},
	},
	required: ["node", "creator", "createdAt"],
	allOf: [
		// if not an argument or content-node, require "titles" prop
		{
			if: {prohibited: ["argumentType", "equation", "quote", "image"]},
			then: {required: ["titles"]},
		},
	],
});
AddSchema("MapNodeRevision_Partial", (()=>{
	const schema = GetSchemaJSON("MapNodeRevision");
	// schema.required = (schema.required as string[]).Except('creator', 'createdAt');
	schema.required = [];
	return schema;
})());

// argument
// ==========

export enum ArgumentType {
	Any = 10,
	AnyTwo = 15,
	All = 20,
}
AddSchema("ArgumentType", {oneOf: GetValues_ForSchema(ArgumentType)});

export function GetArgumentTypeDisplayText(type: ArgumentType) {
	return {Any: "any", AnyTwo: "any two", All: "all"}[ArgumentType[type]];
}