import {GetValues_ForSchema, CE} from "js-vextensions";
import {AddAJVExtraCheck, AddSchema, GetSchemaJSON, UUID, UUID_regex, UUID_regex_partial} from "mobx-firelink";
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

export enum ClaimForm {
	Base = 10,
	Negation = 20,
	YesNoQuestion = 30,
}

export class MapNode {
	constructor(initialData: {type: MapNodeType} & Partial<MapNode>) {
		CE(this).VSet(initialData);
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
	childrenOrder: UUID[]; // only set when type:argument
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
		rootNodeForMap: {$ref: "UUID"},
		ownerMapID: {$ref: "UUID"},

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
		if ((node.childrenOrder ? node.childrenOrder.length : 0) !== (node.children ? node.children.VKeys().length : 0)) {
			return 'Children and childrenOrder lengths differ!';
		}
	}
}); */

// helpers
// export type MapNodeL2 = MapNode & {finalType: MapNodeType};
/** MapNode, except with the current-revision data attached. */
export interface MapNodeL2 extends MapNode {
	current: MapNodeRevision;
}
/** MapNodeL2, except with positional data (and derivations, eg. display-polarity) attached. */
export interface MapNodeL3 extends MapNodeL2 {
	/** For this node (with the given ancestors): How the node would be displayed -- "supporting" being green, "opposing" being red. */
	displayPolarity: Polarity;
	link: ChildEntry;
	//linkToParent: ChildEntry;
	//parentLinkToGrandParent: ChildEntry;
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

	// runtime only
	_mirrorLink?: boolean;
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