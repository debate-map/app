import {GetValues_ForSchema, CE} from "web-vcore/nm/js-vextensions";
import {AddAJVExtraCheck, AddSchema, DB, MGLClass, Field, GetSchemaJSON, UUID, UUID_regex, UUID_regex_partial} from "web-vcore/nm/mobx-graphlink";
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

//export const MapNode_id = UUID_regex;
//export const MapNode_chainAfterFormat = "^(\\[start\\]|[0-9]+)$";
@MGLClass({table: "nodes"}, null, t=>{
	t.comment("@name MapNode"); // avoids conflict with the default "Node" type that Postgraphile defines for Relay
})
export class MapNode {
	constructor(initialData: {type: MapNodeType} & Partial<MapNode>) {
		CE(this).VSet(initialData);
	}

	@DB((t,n)=>t.text(n).primary())
	@Field({oneOf: GetValues_ForSchema(MapNodeType)})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	accessPolicy: string;

	@DB((t,n)=>t.text(n))
	@Field({$ref: "MapNodeType"}, {req: true})
	type?: MapNodeType;

	@DB((t,n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {req: true})
	creator?: string;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"}, {req: true})
	createdAt: number;

	@DB((t,n)=>t.text(n).references("id").inTable(`maps`).DeferRef())
	@Field({$ref: "UUID"})
	rootNodeForMap?: string;

	// if subnode
	//layerPlusAnchorParents: LayerPlusAnchorParentSet;
	/*layerOwner: UUID;
	layerAnchorNode: UUID;*/

	// local-only
	//informalArgumentsHolder?: boolean;
	//premiseAddHelper?: boolean;
}
AddSchema("MapNode_Partial", (()=>{
	const schema = GetSchemaJSON("MapNode");
	// schema.required = (schema.required as string[]).Except('creator', 'createdAt');
	schema.required = ["type"];
	return schema;
})());
// disabled for now, simply because we haven't finished making all places that manipulate "MapNode.children" reliably update "MapNode.childrenOrder" as well
/*AddAJVExtraCheck('MapNode', (node: MapNode) => {
	if (node.type == MapNodeType.Argument) {
		if ((node.childrenOrder ? node.childrenOrder.length : 0) !== (node.children ? node.children.VKeys().length : 0)) {
			return 'Children and childrenOrder lengths differ!';
		}
	}
});*/

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

export enum ChildOrderType {
	Manual = 10,
	ByRating = 20,
}
AddSchema("ChildOrderType", {oneOf: GetValues_ForSchema(ChildOrderType)});

// layer+anchor parents (for if subnode)
// ==========

export type LayerPlusAnchorParentSet = { [key: string]: boolean; };
AddSchema("LayerPlusAnchorParentSet", {patternProperties: {[`${UUID_regex_partial}\\+${UUID_regex_partial}`]: {type: "boolean"}}});