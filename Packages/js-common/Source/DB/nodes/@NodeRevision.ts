import {GetValues_ForSchema, CE, CreateStringEnum, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, DB, MGLClass, GetSchemaJSON, Field, GetSchemaJSON_Cloned} from "web-vcore/nm/mobx-graphlink.js";
import {Map} from "../maps/@Map.js";
import {NodeL3} from "./@Node.js";
import {NodePhrasing, NodePhrasing_Embedded} from "../nodePhrasings/@NodePhrasing.js";
import {ChildGroup, NodeType_Info} from "./@NodeType.js";
import {EquationAttachment, ReferencesAttachment, QuoteAttachment, MediaAttachment, Attachment} from "../../DB.js";
import {ChildOrdering} from "../nodeRatings.js";
import {MarkerForNonScalarField, PickOnly} from "../../Utils/General/General.js";

export enum PermissionInfoType {
	creator = "creator",
	mapEditors = "mapEditors",
	anyone = "anyone",
}
AddSchema("PermissionInfoType", {enum: GetValues(PermissionInfoType)});

export class PermissionInfo {
	constructor(initialData: Partial<PermissionInfo>) {
		CE(this).VSet(initialData);
	}
	type: PermissionInfoType;
}
AddSchema("PermissionInfo", {
	properties: {
		type: {$ref: "PermissionInfoType"},
		mapID: {type: "string"},
	},
	required: ["type"],
});

@MGLClass()
export class NodeRevisionDisplayDetails {
	@Field({type: ["number", "null"]}, {opt: true})
	fontSizeOverride?: number;

	@Field({type: ["number", "null"]}, {opt: true})
	widthOverride?: number;

	@Field({$ref: "ChildLayout"}, {opt: true})
	childLayout?: ChildLayout;

	@Field({$ref: "ChildOrdering"}, {opt: true})
	childOrdering?: ChildOrdering;
}

export enum ChildLayout {
	dmStandard = "dmStandard",
	slStandard = "slStandard",
}
export const ChildLayout_niceNames = {
	dmStandard: "Debate Map standard",
	slStandard: "Society Library standard",
};
AddSchema("ChildLayout", {enum: GetValues(ChildLayout)});
export const ChildLayout_optionsStr = `
Options:
* Unchanged: Don't change the child-layout from the contextual default. (see below)
* Debate Map standard
* Society Library standard, with some extra functionality:
1) Titles can have narrative form. (and new claims under categories don't default to question form)
2) Bracketed prefix-text gets extracted.
3) Multi-premise args start with premises collapsed.

The final ordering-type is determined by the first provided value (ie. not set to "Unchanged") in this list:
1) Node setting, in node's Details->Others panel (if map has "Allow special" for child-layouts enabled)
2) Map setting, in map's Details dropdown (if map has "Allow special" for child-layouts enabled)
3) Fallback value of "Debate Map standard"
`.AsMultiline(0);
export function GetChildLayout_Final(revision: NodeRevision, map?: Map|n): ChildLayout {
	let result = ChildLayout.dmStandard;
	if (map?.extras.allowSpecialChildLayouts) {
		if (map.extras.defaultChildLayout) result = map.extras.defaultChildLayout;
		if (revision.displayDetails?.childLayout) result = revision.displayDetails.childLayout;
	}
	return result;
}
/*export function InvertChildLayout(layout: ChildLayout): ChildLayout {
	return layout == ChildLayout.grouped ? ChildLayout.flat : ChildLayout.grouped;
}*/

export function IsChildGroupValidForNode(node: NodeL3|n, group: ChildGroup) {
	if (node == null) return false;
	const groupValidForNode = NodeType_Info.for[node.type].childGroup_childTypes.has(group);
	return groupValidForNode;
}

/*export enum ChildGroupLayout {
	group_always = "group_always",
	group_whenNonEmpty = "group_whenNonEmpty",
	flat = "flat",
}
const ChildGroupLayout_mapping = new globalThis.Map<ChildLayout, globalThis.Map<ChildGroup, ChildGroupLayout>>([
	[ChildLayout.grouped, new globalThis.Map([
		[ChildGroup.truth, ChildGroupLayout.group_always],
		[ChildGroup.relevance, ChildGroupLayout.group_always],
		[ChildGroup.freeform, ChildGroupLayout.group_always],
	])],
	[ChildLayout.dmStandard, new globalThis.Map([
		[ChildGroup.truth, ChildGroupLayout.group_always],
		[ChildGroup.relevance, ChildGroupLayout.group_always],
		[ChildGroup.freeform, ChildGroupLayout.group_whenNonEmpty],
	])],
	[ChildLayout.slStandard, new globalThis.Map([
		[ChildGroup.truth, ChildGroupLayout.group_always],
		[ChildGroup.relevance, ChildGroupLayout.group_whenNonEmpty],
		[ChildGroup.freeform, ChildGroupLayout.flat],
	])],
	[ChildLayout.flat, new globalThis.Map([
		[ChildGroup.truth, ChildGroupLayout.flat],
		// even in flat mode, we show relevance-args in separate box, else it messes up the path extend/concat logic (could be fixed, but not high priority, since relevance-args are rare in flat-layout mode; just use box)
		//[ChildGroup.relevance, ChildGroupLayout.group_whenNonEmpty],
		[ChildGroup.relevance, ChildGroupLayout.flat], // maybe temp
		[ChildGroup.freeform, ChildGroupLayout.flat],
	])],
]);
export function GetChildGroupLayout(group: ChildGroup, overallLayout: ChildLayout) {
	return ChildGroupLayout_mapping.get(overallLayout)?.get(group);
}
export function ShouldChildGroupBoxBeVisible(node: NodeL3|n, group: ChildGroup, overallLayout: ChildLayout, nodeChildren: NodeL3[]|null) {
	if (node == null) return false;
	if (!IsChildGroupValidForNode(node, group)) return false;

	const groupLayout = GetChildGroupLayout(group, overallLayout);
	if (groupLayout == ChildGroupLayout.group_always) return true;
	if (groupLayout == ChildGroupLayout.group_whenNonEmpty) return nodeChildren?.Any(a=>a.link?.group == group) ?? false;
	return false;
}*/

/*export const NodeRevision_Defaultable_props = ["accessLevel", "votingDisabled", "permission_edit", "permission_contribute"] as const;
export type NodeRevision_Defaultable = Pick<NodeRevision, "accessLevel" | "votingDisabled" | "permission_edit" | "permission_contribute">;*/
/*export const NodeRevision_Defaultable_props = [] as const;
export type NodeRevision_Defaultable = Pick<NodeRevision, never>;
export function NodeRevision_Defaultable_DefaultsForMap(): NodeRevision_Defaultable {
	return {};
}*/

//export const NodeRevision_titlePattern = `(^\\S$)|(^\\S.*\\S$)`; // must start and end with non-whitespace
export const NodeRevision_titlePattern = "^(\\S.*|.{0})$"; // must start with non-whitespace, or be empty
@MGLClass({table: "nodeRevisions"}, {
	allOf: [
		// if not an argument or content-node, require "phrasing" prop
		{
			if: {prohibited: ["argumentType", "equation", "quote", "media"]},
			then: {required: ["phrasing"]},
		},
	],
})
export class NodeRevision {
	constructor(initialData?: Partial<NodeRevision>|n) {
		CE(this).VSet(initialData);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
	node: string;

	@DB((t, n)=>t.text(n).nullable()) //.references("id").inTable(`nodeRevisions`).DeferRef()) // disabled for now, relating to deletion
	@Field({type: ["null", "string"]}, {opt: true})
	replacedBy?: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({$ref: "UUID"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	//updatedAt: number;
	//approved = false;

	@DB((t, n)=>t.jsonb(n))
	@Field({$ref: "NodePhrasing_Embedded", ...MarkerForNonScalarField()})
	phrasing = NodePhrasing.Embedded({text_base: ""});

	/*@DB((t, n)=>t.specificType(n, `tsvector generated always as (jsonb_to_tsvector('english_nostop', phrasing, '["string"]')) stored`).notNullable())
	//@Field({type: "null"}) // user should not pass this in themselves
	@Field({$gqlType: "JSON", $noWrite: true}, {opt: true})
	phrasing_tsvector?: any;*/

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: NodeRevisionDisplayDetails.name}, {opt: true})
	displayDetails?: NodeRevisionDisplayDetails;

	@DB((t, n)=>t.jsonb(n))
	@Field({items: {$ref: "Attachment"}, ...MarkerForNonScalarField()})
	attachments: Attachment[] = [];
}
AddSchema("NodeRevision_Partial", ["NodeRevision"], ()=>{
	const schema = GetSchemaJSON_Cloned("NodeRevision");
	// schema.required = (schema.required as string[]).Except('creator', 'createdAt');
	schema.required = [];
	return schema;
});

export const NodeRevisionInput_keys = ["node", "phrasing", "displayDetails", "attachments"] as const;
export type NodeRevisionInput = PickOnly<NodeRevision, typeof NodeRevisionInput_keys[number]>;
export const AsNodeRevisionInput = (node: NodeRevision)=>node.IncludeKeys(...NodeRevisionInput_keys) as NodeRevisionInput;

// argument
// ==========

export enum ArgumentType {
	any = "any",
	anyTwo = "anyTwo",
	all = "all",
}
AddSchema("ArgumentType", {enum: GetValues(ArgumentType)});