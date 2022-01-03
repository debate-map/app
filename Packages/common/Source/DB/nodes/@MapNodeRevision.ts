import {GetValues_ForSchema, CE, CreateStringEnum, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, DB, MGLClass, GetSchemaJSON, Field} from "web-vcore/nm/mobx-graphlink.js";
import {Map} from "../maps/@Map.js";
import {AccessLevel, MapNodeL3} from "./@MapNode.js";
import {MapNodePhrasing, MapNodePhrasing_Embedded} from "../nodePhrasings/@MapNodePhrasing.js";
import {ChildGroup, MapNodeType_Info} from "./@MapNodeType.js";
import {EquationAttachment, ReferencesAttachment, QuoteAttachment, MediaAttachment} from "../../DB.js";

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
}

export enum ChildLayout {
	grouped = "grouped",
	dmStandard = "dmStandard",
	slStandard = "slStandard",
	flat = "flat",
}
export const ChildLayout_niceNames = {
	grouped: "Grouped",
	dmStandard: "Debate Map standard",
	slStandard: "Society Library standard",
	flat: "Flat",
};
AddSchema("ChildLayout", {enum: GetValues(ChildLayout)});

export enum ChildGroupLayout {
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
		[ChildGroup.relevance, ChildGroupLayout.group_whenNonEmpty],
		[ChildGroup.freeform, ChildGroupLayout.flat],
	])],
]);
export function GetChildGroupLayout(group: ChildGroup, overallLayout: ChildLayout) {
	return ChildGroupLayout_mapping.get(overallLayout)?.get(group);
}
export function ShouldChildGroupBoxBeVisible(node: MapNodeL3|n, group: ChildGroup, overallLayout: ChildLayout, nodeChildren: MapNodeL3[]|null) {
	if (node == null) return false;
	const groupValidForNode = MapNodeType_Info.for[node.type].childGroup_childTypes.has(group);
	if (!groupValidForNode) return false;

	const groupLayout = GetChildGroupLayout(group, overallLayout);
	if (groupLayout == ChildGroupLayout.group_always) return true;
	if (groupLayout == ChildGroupLayout.group_whenNonEmpty) return nodeChildren?.Any(a=>a.link?.group == group) ?? false;
	return false;
}

export function GetChildLayout_Final(revision: MapNodeRevision, map?: Map): ChildLayout {
	let result = ChildLayout.dmStandard;
	if (map?.extras.allowSpecialChildLayouts) {
		if (map.extras.defaultChildLayout) {
			result = map.extras.defaultChildLayout;
		}
		if (revision.displayDetails?.childLayout) {
			result = revision.displayDetails.childLayout;
		}
	}
	return result;
}
/*export function InvertChildLayout(layout: ChildLayout): ChildLayout {
	return layout == ChildLayout.grouped ? ChildLayout.flat : ChildLayout.grouped;
}*/

/*export const MapNodeRevision_Defaultable_props = ["accessLevel", "votingDisabled", "permission_edit", "permission_contribute"] as const;
export type MapNodeRevision_Defaultable = Pick<MapNodeRevision, "accessLevel" | "votingDisabled" | "permission_edit" | "permission_contribute">;*/
/*export const MapNodeRevision_Defaultable_props = [] as const;
export type MapNodeRevision_Defaultable = Pick<MapNodeRevision, never>;
export function MapNodeRevision_Defaultable_DefaultsForMap(): MapNodeRevision_Defaultable {
	return {};
}*/

//export const MapNodeRevision_titlePattern = `(^\\S$)|(^\\S.*\\S$)`; // must start and end with non-whitespace
export const MapNodeRevision_titlePattern = "^\\S.*$"; // must start with non-whitespace
@MGLClass({table: "nodeRevisions"}, {
	allOf: [
		// if not an argument or content-node, require "phrasing" prop
		{
			if: {prohibited: ["argumentType", "equation", "quote", "media"]},
			then: {required: ["phrasing"]},
		},
	],
})
export class MapNodeRevision {
	constructor(initialData?: Partial<MapNodeRevision>|n) {
		CE(this).VSet(initialData);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
	node: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({$ref: "UUID"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	//updatedAt: number;
	//approved = false;

	@DB((t, n)=>t.jsonb(n))
	@Field({$ref: "MapNodePhrasing_Embedded"})
	phrasing = MapNodePhrasing.Embedded({text_base: ""});

	@DB((t, n)=>t.specificType(n, `tsvector generated always as (jsonb_to_tsvector('english_nostop', phrasing, '["string"]')) stored`).notNullable())
	//@Field({type: "null"}) // user should not pass this in themselves
	@Field({$gqlType: "JSON", $noWrite: true}, {opt: true})
	phrasing_tsvector?: any;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: ["null", "string"]}, {opt: true}) // add null-type, for later when the payload-validation schema is derived from the main schema
	note?: string;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: NodeRevisionDisplayDetails.name}, {opt: true})
	displayDetails?: NodeRevisionDisplayDetails;

	// attachments
	// ==========

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: EquationAttachment.name}, {opt: true})
	equation?: EquationAttachment;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: ReferencesAttachment.name}, {opt: true})
	references?: ReferencesAttachment;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: QuoteAttachment.name}, {opt: true})
	quote?: QuoteAttachment;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: MediaAttachment.name}, {opt: true})
	media?: MediaAttachment;
}
AddSchema("MapNodeRevision_Partial", ["MapNodeRevision"], ()=>{
	const schema = GetSchemaJSON("MapNodeRevision");
	// schema.required = (schema.required as string[]).Except('creator', 'createdAt');
	schema.required = [];
	return schema;
});

// argument
// ==========

export enum ArgumentType {
	any = "any",
	anyTwo = "anyTwo",
	all = "all",
}
AddSchema("ArgumentType", {enum: GetValues(ArgumentType)});