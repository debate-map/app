import {GetValues, GetValues_ForSchema} from "../../../Frame/General/Enums";
import {Polarity} from "./@MapNode";

export class MetaThesisInfo {
	ifType: MetaThesis_IfType;
	thenType: MetaThesis_ThenType;
}
AddSchema({
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
AddSchema({oneOf: GetValues_ForSchema(MetaThesis_IfType)}, "MetaThesis_IfType");

export function GetMetaThesisIfTypeDisplayText(ifType: MetaThesis_IfType) {
	return MetaThesis_IfType[ifType].replace(/[a-z][A-Z]/, m=>m[0] + " " + m[1].toLowerCase()).toLowerCase();
}

export enum MetaThesis_ThenType {
	Impact = 10,
	Guarantee = 20,
}
AddSchema({oneOf: GetValues_ForSchema(MetaThesis_ThenType)}, "MetaThesis_ThenType");

export function GetMetaThesisThenTypeDisplayText(thenType: MetaThesis_ThenType, polarity: Polarity) {
	if (thenType == MetaThesis_ThenType.Impact) {
		return polarity == Polarity.Supporting ? "strengthen the parent" : "weaken the parent";
	}
	return polarity == Polarity.Supporting ? "guarantee the parent true" : "guarantee the parent false";
}