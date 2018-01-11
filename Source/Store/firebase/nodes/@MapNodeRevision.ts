import {MapNodeType} from "./@MapNodeType";
import {AccessLevel, ImageAttachment} from "./@MapNode";
import {MetaThesisInfo} from "./@MetaThesisInfo";
import {Equation} from "./@Equation";
import {ContentNode} from "../contentNodes/@ContentNode";
import {GetValues_ForSchema} from "../../../Frame/General/Enums";

export class MapNodeRevision {
	constructor(initialData: {type: MapNodeType} & Partial<MapNodeRevision>) {
		this.Extend(initialData);
	}

	type?: MapNodeType;
	titles: {[key: string]: string};
	note: string;

	//updatedAt: number;
	approved = false;
	votingDisabled: boolean;
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
}
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
		approved: {type: "boolean"},
		votingDisabled: {type: ["null", "boolean"]},
		accessLevel: {oneOf: GetValues_ForSchema(AccessLevel).concat({const: null})},
		voteLevel: {oneOf: GetValues_ForSchema(AccessLevel).concat({const: null})}, // not currently used

		relative: {type: "boolean"},
		fontSizeOverride: {type: ["null", "number"]},
		widthOverride: {type: ["null", "number"]},

		metaThesis: {$ref: "MetaThesisInfo"},
		equation: {$ref: "Equation"},
		contentNode: {$ref: "ContentNode"},
		image: {$ref: "ImageAttachment"},
	},
	required: ["type"],
	allOf: [
		// if not a meta-thesis or contentNode, require "titles" prop
		{
			if: {prohibited: ["metaThesis", "equation", "contentNode", "image"]},
			then: {required: ["titles"]},
		},
	],
}, "MapNodeRevision");