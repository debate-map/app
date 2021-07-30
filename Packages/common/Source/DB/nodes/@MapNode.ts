import {GetValues_ForSchema, CE, IsNumberString, CreateStringEnum, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddAJVExtraCheck, AddSchema, DB, MGLClass, Field, GetSchemaJSON, UUID, UUID_regex, UUID_regex_partial} from "web-vcore/nm/mobx-graphlink.js";
import {AccessPolicy} from "../accessPolicies/@AccessPolicy.js";
import {NodeChildLink} from "../nodeChildLinks/@NodeChildLink.js";
import {ArgumentType, MapNodeRevision} from "./@MapNodeRevision.js";
import {MapNodeType} from "./@MapNodeType.js";

export enum AccessLevel {
	basic = "basic",
	verified = "verified",
	mod = "mod",
	admin = "admin",
}
AddSchema("AccessLevel", {enum: GetValues(AccessLevel)});

export enum ClaimForm {
	base = "base",
	negation = "negation",
	question = "question",
}
//export type ClaimForm = typeof ClaimForm_values[number];
AddSchema("ClaimForm", {enum: GetValues(ClaimForm)});

//export const MapNode_id = UUID_regex;
//export const MapNode_chainAfterFormat = "^(\\[start\\]|[0-9]+)$";
@MGLClass({table: "nodes"}, undefined, t=>{
	//t.comment("@name MapNode"); // avoids conflict with the default "Node" type that Postgraphile defines for Relay
})
export class MapNode {
	constructor(initialData: {type: MapNodeType} & Partial<MapNode>) {
		CE(this).VSet(initialData);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	accessPolicy: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "MapNodeType"})
	type: MapNodeType;

	@DB((t, n)=>t.text(n).nullable())
	@Field({$ref: "ArgumentType"}, {opt: true})
	argumentType?: ArgumentType;

	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"}, {opt: true})
	multiPremiseArgument?: boolean;

	@DB((t, n)=>t.text(n).nullable().references("id").inTable(`maps`).DeferRef())
	@Field({$ref: "UUID"}, {opt: true})
	rootNodeForMap?: string;

	// if subnode
	//layerPlusAnchorParents: LayerPlusAnchorParentSet;
	/*layerOwner: UUID;
	layerAnchorNode: UUID;*/

	// local-only
	//informalArgumentsHolder?: boolean;
	//premiseAddHelper?: boolean;
}
AddSchema("MapNode_Partial", ["MapNode"], ()=>{
	const schema = GetSchemaJSON("MapNode");
	// schema.required = (schema.required as string[]).Except('creator', 'createdAt');
	schema.required = ["type"];
	return schema;
});
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
/** MapNode, except with the access-policy and current-revision data attached. (no view-related stuff) */
export interface MapNodeL2 extends MapNode {
	policy: AccessPolicy;
	current: MapNodeRevision;
}
/** MapNodeL2, except with some view-related stuff included. (eg. display-polarity based on path, current lens) */
export interface MapNodeL3 extends MapNodeL2 {
	/** For this node (with the given ancestors): How the node would be displayed -- "supporting" being green, "opposing" being red. */
	displayPolarity: Polarity;
	link: NodeChildLink|n;
	//linkToParent: ChildEntry;
	//parentLinkToGrandParent: ChildEntry;
}
export type MapNodeL3_Argument = MapNodeL3 & Required<Pick<MapNodeL3, "argumentType" | "multiPremiseArgument">>;

/*export enum Polarity {
	Supporting = 10,
	Opposing = 20,
}
AddSchema("Polarity", {enum: GetValues(Polarity)});*/
/*export const Polarity_values = ["supporting", "opposing"] as const;
export type Polarity = typeof Polarity_values[number];
AddSchema("Polarity", {oneOf: Polarity_values});*/

export enum Polarity {
	supporting = "supporting",
	opposing = "opposing",
}
//export type Polarity = typeof Polarity_values[number];
AddSchema("Polarity", {enum: GetValues(Polarity)});

// regular parents
// ==========

export enum ChildOrderType {
	manual = "manual",
	byRating = "byRating",
}
AddSchema("ChildOrderType", {enum: GetValues(ChildOrderType)});

// layer+anchor parents (for if subnode)
// ==========

/*export type LayerPlusAnchorParentSet = { [key: string]: boolean; };
AddSchema("LayerPlusAnchorParentSet", {patternProperties: {[`${UUID_regex_partial}\\+${UUID_regex_partial}`]: {type: "boolean"}}});*/