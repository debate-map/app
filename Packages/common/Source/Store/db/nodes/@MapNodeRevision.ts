import {GetValues_ForSchema, CE, CreateStringEnum} from "web-vcore/nm/js-vextensions";
import {AddSchema, DB, MGLClass, GetSchemaJSON, Field} from "web-vcore/nm/mobx-graphlink";
import {QuoteAttachment} from "../nodeRevisions/@QuoteAttachment";
import {MapType} from "../maps/@Map";
import {MediaAttachment} from "../nodeRevisions/@MediaAttachment";
import {AccessLevel} from "./@MapNode";
import {EquationAttachment} from "../nodeRevisions/@EquationAttachment";
import {TermAttachment} from "../nodeRevisions/@TermAttachment";
import {ReferencesAttachment} from "../nodeRevisions/@ReferencesAttachment";

export const TitleKey_values = ["base", "negation", "yesNoQuestion"] as const;
//export type TitleKey = "base" | "negation" | "yesNoQuestion";
//export type TitleKey = keyof typeof TitleKey_values;
export type TitleKey = typeof TitleKey_values[number];
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
	creator = "creator",
	mapEditors = "mapEditors",
	anyone = "anyone",
}
AddSchema("PermissionInfoType", {oneOf: GetValues_ForSchema(PermissionInfoType)});

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
	@Field({type: ["number", "null"]})
	fontSizeOverride: number;
	@Field({type: ["number", "null"]})
	widthOverride: number;
}

/*export const MapNodeRevision_Defaultable_props = ["accessLevel", "votingDisabled", "permission_edit", "permission_contribute"] as const;
export type MapNodeRevision_Defaultable = Pick<MapNodeRevision, "accessLevel" | "votingDisabled" | "permission_edit" | "permission_contribute">;*/
export const MapNodeRevision_Defaultable_props = [] as const;
export type MapNodeRevision_Defaultable = Pick<MapNodeRevision, never>;
export function MapNodeRevision_Defaultable_DefaultsForMap(mapType: MapType): MapNodeRevision_Defaultable {
	return {
		accessLevel: AccessLevel.basic,
		votingDisabled: false,
		permission_edit: new PermissionInfo({type: mapType == MapType.private ? PermissionInfoType.mapEditors : PermissionInfoType.creator}),
		permission_contribute: new PermissionInfo({type: mapType == MapType.private ? PermissionInfoType.mapEditors : PermissionInfoType.anyone}),
	};
}

//export const MapNodeRevision_titlePattern = `(^\\S$)|(^\\S.*\\S$)`; // must start and end with non-whitespace
export const MapNodeRevision_titlePattern = "^\\S.*$"; // must start with non-whitespace
@MGLClass({table: "nodeRevisions"}, {
	allOf: [
		// if not an argument or content-node, require "titles" prop
		{
			if: {prohibited: ["argumentType", "equation", "quote", "media"]},
			then: {required: ["titles"]},
		},
	],
})
export class MapNodeRevision {
	constructor(initialData: Partial<MapNodeRevision>) {
		CE(this).VSet(initialData);
	}

	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"}, {req: true})
	node: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {req: true})
	creator?: string;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"}, {req: true})
	createdAt: number;

	//updatedAt: number;
	//approved = false;

	// text
	@DB((t,n)=>t.jsonb(n))
	@Field({
		properties: {
			// base: {pattern: MapNodeRevision_titlePattern}, negation: {pattern: MapNodeRevision_titlePattern}, yesNoQuestion: {pattern: MapNodeRevision_titlePattern},
			base: {type: "string"}, negation: {type: "string"}, yesNoQuestion: {type: "string"},
		},
		// required: ["base", "negation", "yesNoQuestion"],
	})
	titles = {base: ""} as TitlesMap;

	@DB((t,n)=>t.text(n))
	@Field({type: ["null", "string"]}) // add null-type, for later when the payload-validation schema is derived from the main schema
	note: string;

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: NodeRevisionDisplayDetails.name})
	displayDetails: NodeRevisionDisplayDetails;

	@DB((t,n)=>t.text(n))
	@Field({$ref: "ArgumentType"})
	argumentType: ArgumentType;

	@DB((t,n)=>t.text(n))
	@Field({type: "boolean"})
	multiPremiseArgument: boolean;

	@DB((t,n)=>t.boolean(n))
	@Field({type: "boolean"})
	votingEnabled: boolean;

	// attachments
	// ==========

	@DB((t,n)=>t.specificType(n, "text[]"))
	@Field({items: {$ref: TermAttachment.name}})
	termAttachments: TermAttachment[];

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: EquationAttachment.name})
	equation: EquationAttachment;

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: ReferencesAttachment.name})
	references: ReferencesAttachment;

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: QuoteAttachment.name})
	quote: QuoteAttachment;

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: MediaAttachment.name})
	media: MediaAttachment;
}
AddSchema("MapNodeRevision_Partial", (()=>{
	const schema = GetSchemaJSON("MapNodeRevision");
	// schema.required = (schema.required as string[]).Except('creator', 'createdAt');
	schema.required = [];
	return schema;
})());

// argument
// ==========

export enum ArgumentType {
	any = "any",
	anyTwo = "anyTwo",
	all = "all",
}
AddSchema("ArgumentType", {oneOf: GetValues_ForSchema(ArgumentType)});

export function GetArgumentTypeDisplayText(type: ArgumentType) {
	return {Any: "any", AnyTwo: "any two", All: "all"}[ArgumentType[type]];
}