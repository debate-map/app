import {MetaThesis_ThenType} from "../@MetaThesisInfo";

export function ReverseThenType(thenType: MetaThesis_ThenType) {
	if (thenType == MetaThesis_ThenType.GuaranteeParentFalse) return MetaThesis_ThenType.GuaranteeParentTrue;
	if (thenType == MetaThesis_ThenType.GuaranteeParentTrue) return MetaThesis_ThenType.GuaranteeParentFalse;
	if (thenType == MetaThesis_ThenType.WeakenParent) return MetaThesis_ThenType.StrengthenParent;
	if (thenType == MetaThesis_ThenType.StrengthenParent) return MetaThesis_ThenType.WeakenParent;
	Assert(false);
}