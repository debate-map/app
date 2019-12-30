import {GetValues_ForSchema} from "js-vextensions";
import {AddAJVExtraCheck, AddSchema, GetSchemaJSON} from "vwebapp-framework";
import {UUID_regex, UUID, UUID_regex_partial} from "Utils/General/KeyGenerator";
import {MapNodeRevision} from "./@MapNodeRevision";
import {MapNodeType} from "./@MapNodeType";

// these are 22-chars, matching 22-char uuids/slug-ids
export const globalMapID = "GLOBAL_MAP_00000000001";
export const globalRootNodeID = "GLOBAL_ROOT_0000000001";

export enum AccessLevel {
	Basic = 10,
	Verified = 20, // for accounts we're pretty sure are legitimate (an actual person's only account)
	Mod = 30,
	Admin = 40,
}

export enum ClaimType {
	Normal = 10,
	// ImpactPremise = 20,
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
		this.VSet(initialData);
	}

	_key?: string;
	type?: MapNodeType;
	creator?: string;
	createdAt: number;
	rootNodeForMap?: string;
	ownerMapID?: string;

	currentRevision: string;

	parents: ParentSet;
	children: ChildSet;
	childrenOrder: UUID[];
	// talkRoot: number;
	multiPremiseArgument?: boolean;

	// if subnode
	layerPlusAnchorParents: LayerPlusAnchorParentSet;
	/* layerOwner: UUID;
	layerAnchorNode: UUID; */

	// local-only
	informalArgumentsHolder?: boolean;
	premiseAddHelper?: boolean;
}
// export const MapNode_id = UUID_regex;
// export const MapNode_chainAfterFormat = "^(\\[start\\]|[0-9]+)$";
AddSchema("MapNode", {
	properties: {
		type: {oneOf: GetValues_ForSchema(MapNodeType)},
		creator: {type: "string"},
		createdAt: {type: "number"},
		rootNodeForMap: {type: "string"},
		ownerMapID: {type: "string"},

		currentRevision: {type: "string"},

		parents: {$ref: "ParentSet"},
		children: {$ref: "ChildSet"},
		childrenOrder: {items: {$ref: "UUID"}},
		// talkRoot: {type: "number"},
		multiPremiseArgument: {type: "boolean"},

		layerPlusAnchorParents: {$ref: "LayerPlusAnchorParentSet"},
		// layerOwner: { $ref: 'UUID' },
	},
	required: ["type", "creator", "createdAt", "currentRevision"],
	/* allOf: [
		// if an argument, require "childrenOrder" prop
		{
			if: {
				properties: {
					type: {const: MapNodeType.Argument},
				}
			},
			then: {required: ["childrenOrder"]},
			else: {prohibited: ["childrenOrder"]}
		}
	], */
});
AddSchema("MapNode_Partial", (()=>{
	const schema = GetSchemaJSON("MapNode");
	// schema.required = (schema.required as string[]).Except('creator', 'createdAt');
	schema.required = ["type"];
	return schema;
})());
// disabled for now, simply because we haven't finished making all places that manipulate "MapNode.children" reliably update "MapNode.childrenOrder" as well
/* AddAJVExtraCheck('MapNode', (node: MapNode) => {
	if (node.type == MapNodeType.Argument) {
		if ((node.childrenOrder ? node.childrenOrder.length : 0) !== (node.children ? node.children.VKeys(true).length : 0)) {
			return 'Children and childrenOrder lengths differ!';
		}
	}
}); */

// helpers
// export type MapNodeL2 = MapNode & {finalType: MapNodeType};
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

export type ParentSet = { [key: string]: ParentEntry; };
AddSchema("ParentSet", {patternProperties: {[UUID_regex]: {$ref: "ParentEntry"}}});
export type ParentEntry = { _: boolean; };
AddSchema("ParentEntry", {
	properties: {_: {type: "boolean"}},
	required: ["_"],
});

export type ChildSet = { [key: string]: ChildEntry; };
AddSchema("ChildSet", {patternProperties: {[UUID_regex]: {$ref: "ChildEntry"}}});
export type ChildEntry = {
	_: boolean;
	form?: ClaimForm;
	seriesAnchor?: boolean;
	polarity?: Polarity;
};
AddSchema("ChildEntry", {
	properties: {
		_: {type: "boolean"},
		form: {oneOf: GetValues_ForSchema(ClaimForm)},
		seriesAnchor: {type: ["null", "boolean"]},
		polarity: {oneOf: GetValues_ForSchema(Polarity)},
	},
	required: ["_"],
});

// layer+anchor parents (for if subnode)
// ==========

export type LayerPlusAnchorParentSet = { [key: string]: boolean; };
AddSchema("LayerPlusAnchorParentSet", {patternProperties: {[`${UUID_regex_partial}\\+${UUID_regex_partial}`]: {type: "boolean"}}});

// others
// ==========

export class ImageAttachment {
	id: string;
}
AddSchema("ImageAttachment", {
	properties: {
		id: {type: "string"},
	},
	required: ["id"],
});