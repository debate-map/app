import {AddSchema, DeriveJSONSchema, Field, MGLClass} from "mobx-graphlink";
import {GetValues_ForSchema, CE, CreateStringEnum, GetValues} from "js-vextensions";
import {TermAttachment} from "../@Shared/Attachments/@TermAttachment.js";
import {MarkerForNonScalarField} from "../../Utils/General/General.js";

@MGLClass({table: "nodePhrasings"})
export class NodePhrasing {
	static Embedded(data: Partial<NodePhrasing>) {
		const base = new NodePhrasing(data);
		const result = CullNodePhrasingToBeEmbedded(base);
		return result;
	}

	constructor(data: Partial<NodePhrasing>) {
		CE(this).VSet(data);
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({$ref: "UUID"}, {opt: true})
	creator: string;

	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@Field({$ref: "UUID"})
	node: string;

	@Field({$ref: "NodePhrasingType"})
	type: NodePhrasingType;

	@Field({type: "string"})
	text_base: string;

	@Field({type: "string"}, {opt: true})
	text_negation?: string;

	@Field({type: "string"}, {opt: true})
	text_question?: string;

	@Field({type: "string"}, {opt: true})
	text_narrative?: string;

	@Field({type: "string"}, {opt: true})
	note?: string;

	//@DB((t, n)=>t.jsonb(n)) // commented; the root of a jsonb column must be an object (not an array)
	@Field({items: {$ref: TermAttachment.name}, ...MarkerForNonScalarField()})
	terms: TermAttachment[] = [];

	@Field({items: {type: "string"}})
	c_accessPolicyTargets: string[]; // format is: `${policyId}:${apTable}`

	// for web phrasings
	// ==========

	@Field({items: {type: "string"}})
	references: string[] = [];
}

const NodePhrasing_Embedded_keys = ["text_base", "text_negation", "text_question", "text_narrative", "note", "terms"] as const;
export type NodePhrasing_Embedded = Pick<NodePhrasing, typeof NodePhrasing_Embedded_keys[number]>;
AddSchema("NodePhrasing_Embedded", DeriveJSONSchema(NodePhrasing, {includeOnly: NodePhrasing_Embedded_keys as any}));
export function CullNodePhrasingToBeEmbedded(phrasing: NodePhrasing): NodePhrasing_Embedded {
	for (const key of Object.keys(phrasing)) {
		if (!NodePhrasing_Embedded_keys.includes(key as any)) {
			delete phrasing[key];
		}
	}
	return phrasing;
}

export const TitleKey_values = ["text_base", "text_negation", "text_question", "text_narrative"] as const;
export type TitleKey = typeof TitleKey_values[number];

export enum NodePhrasingType {
	standard = "standard",
	simple = "simple",
	technical = "technical",
	humor = "humor",
	web = "web",
}
AddSchema("NodePhrasingType", {enum: GetValues(NodePhrasingType)});