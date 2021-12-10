import {GetValues_ForSchema, CE, CreateStringEnum, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, DB, MGLClass, GetSchemaJSON, Field} from "web-vcore/nm/mobx-graphlink.js";
import {QuoteAttachment} from "../nodeRevisions/@QuoteAttachment.js";
import {MediaAttachment} from "../nodeRevisions/@MediaAttachment.js";
import {AccessLevel} from "./@MapNode.js";
import {EquationAttachment} from "../nodeRevisions/@EquationAttachment.js";
import {TermAttachment} from "../nodeRevisions/@TermAttachment.js";
import {ReferencesAttachment} from "../nodeRevisions/@ReferencesAttachment.js";
import {MapNodePhrasing, MapNodePhrasing_Embedded} from "../nodePhrasings/@MapNodePhrasing.js";

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

	@Field({type: ["boolean", "null"]}, {opt: true})
	childrenLayout_flat?: boolean;
}

export function GetChildrenLayout(revision: MapNodeRevision) {
	return revision.displayDetails?.childrenLayout_flat ? "flat" : "structured";
}
export function InvertChildrenLayout(layout: "structured" | "flat") {
	return layout == "structured" ? "flat" : "structured";
}

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