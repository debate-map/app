import {MapNodeType} from "./@MapNodeType";
import {AccessLevel, ImageAttachment} from "./@MapNode";
import {Equation} from "./@Equation";
import {ContentNode} from "../contentNodes/@ContentNode";
import {GetValues_ForSchema} from "../../../Frame/General/Enums";

export class MapNodeRevision {
	 constructor(initialData: Partial<MapNodeRevision>) {
		this.Extend(initialData);
	}

	_id?: number;
	node: number;
	creator?: string;
	createdAt: number;

	titles = {base: ""} as {[key: string]: string};
	note: string;

	//updatedAt: number;
	//approved = false;
	votingDisabled: boolean;
	// only applied client-side; would need to be in protected branch of tree (or use a long, random, and unreferenced node-id) to be "actually" inaccessible
	accessLevel = AccessLevel.Basic;
	//voteLevel = AccessLevel.Basic;

	fontSizeOverride: number;
	widthOverride: number;

	// components (for theses)
	argumentType: ArgumentType;
	equation: Equation;
	contentNode: ContentNode;
	image: ImageAttachment;
}
//export const MapNodeRevision_titlePattern = `(^\\S$)|(^\\S.*\\S$)`; // must start and end with non-whitespace
export const MapNodeRevision_titlePattern = `^\\S.*$`; // must start with non-whitespace
AddSchema({
	properties: {
		node: {type: "number"},
		creator: {type: "string"},
		createdAt: {type: "number"},
		
		titles: {
			properties: {
				//base: {pattern: MapNodeRevision_titlePattern}, negation: {pattern: MapNodeRevision_titlePattern}, yesNoQuestion: {pattern: MapNodeRevision_titlePattern},
				base: {type: "string"}, negation: {type: "string"}, yesNoQuestion: {type: "string"},
			},
			//required: ["base", "negation", "yesNoQuestion"],
		},
		note: {type: ["null", "string"]}, // add null-type, for later when the payload-validation schema is derived from the main schema
		approved: {type: "boolean"},
		votingDisabled: {type: ["null", "boolean"]},
		accessLevel: {oneOf: GetValues_ForSchema(AccessLevel).concat({const: null})},
		voteLevel: {oneOf: GetValues_ForSchema(AccessLevel).concat({const: null})}, // not currently used

		relative: {type: "boolean"},
		fontSizeOverride: {type: ["null", "number"]},
		widthOverride: {type: ["null", "number"]},

		argumentType: {$ref: "ArgumentType"},
		equation: {$ref: "Equation"},
		contentNode: {$ref: "ContentNode"},
		image: {$ref: "ImageAttachment"},
	},
	required: ["node", "creator", "createdAt"],
	allOf: [
		// if not an argument or content-node, require "titles" prop
		{
			if: {prohibited: ["argumentType", "equation", "contentNode", "image"]},
			then: {required: ["titles"]},
		},
	],
}, "MapNodeRevision");

// argument
// ==========

export enum ArgumentType {
	Any = 10,
	AnyTwo = 15,
	All = 20,
}
AddSchema({oneOf: GetValues_ForSchema(ArgumentType)}, "ArgumentType");

export function GetArgumentTypeDisplayText(type: ArgumentType) {
	return {Any: "any", AnyTwo: "any two", All: "all"}[ArgumentType[type]];
}