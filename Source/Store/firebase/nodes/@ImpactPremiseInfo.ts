import {GetValues, GetValues_ForSchema} from "./../../../Frame/General/Enums";
import {Polarity} from "./@MapNode";

export class ImpactPremiseInfo {
	ifType: ImpactPremise_IfType;
	thenType: ImpactPremise_ThenType;
}
AddSchema({
	properties: {
		ifType: {$ref: "ImpactPremise_IfType"},
		thenType: {$ref: "ImpactPremise_ThenType"},
	},
	required: ["ifType", "thenType"],
}, "ImpactPremiseInfo");

export enum ImpactPremise_IfType {
	Any = 10,
	AnyTwo = 15,
	All = 20,
}
AddSchema({oneOf: GetValues_ForSchema(ImpactPremise_IfType)}, "ImpactPremise_IfType");

export function GetImpactPremiseIfTypeDisplayText(ifType: ImpactPremise_IfType) {
	return ImpactPremise_IfType[ifType].replace(/[a-z][A-Z]/, m=>m[0] + " " + m[1].toLowerCase()).toLowerCase();
}

export enum ImpactPremise_ThenType {
	Impact = 10,
	Guarantee = 20,
}
AddSchema({oneOf: GetValues_ForSchema(ImpactPremise_ThenType)}, "ImpactPremise_ThenType");

export function GetImpactPremiseThenTypeDisplayText(thenType: ImpactPremise_ThenType, polarity: Polarity) {
	if (thenType == ImpactPremise_ThenType.Impact) {
		return polarity == Polarity.Supporting ? "strengthen the parent" : "weaken the parent";
	}
	return polarity == Polarity.Supporting ? "guarantee the parent true" : "guarantee the parent false";
}