import {GetValues, GetValues_ForSchema} from "../../../Frame/General/Enums";

export class MetaThesisInfo {
	ifType: MetaThesis_IfType;
	thenType: MetaThesis_ThenType;
}
ajv.addSchema({
	properties: {
		ifType: {$ref: "MetaThesis_IfType"},
		thenType: {$ref: "MetaThesis_ThenType"},
	},
	required: ["ifType", "thenType"],
}, "MetaThesisInfo");

export enum MetaThesis_IfType {
	Any = 10,
	AnyTwo = 15,
	All = 20,
}
ajv.addSchema({
	oneOf: GetValues_ForSchema(MetaThesis_IfType),
}, "MetaThesis_IfType");

export function GetMetaThesisIfTypeDisplayText(ifType: MetaThesis_IfType) {
	return MetaThesis_IfType[ifType].replace(/[a-z][A-Z]/, m=>m[0] + " " + m[1].toLowerCase()).toLowerCase();
}

export enum MetaThesis_ThenType {
	StrengthenParent = 10,
	GuaranteeParentTrue = 20,
	WeakenParent = 30,
	GuaranteeParentFalse = 40,
}
ajv.addSchema({
	oneOf: GetValues_ForSchema(MetaThesis_ThenType),
}, "MetaThesis_ThenType");

export class MetaThesis_ThenType_Info {
	static for = {
		StrengthenParent: {displayText: "strengthen the parent"},
		GuaranteeParentTrue: {displayText: "guarantee the parent true"},
		WeakenParent: {displayText: "weaken the parent"},
		GuaranteeParentFalse: {displayText: "guarantee the parent false"},
	} as {[key: string]: MetaThesis_ThenType_Info};

	displayText: string;
}