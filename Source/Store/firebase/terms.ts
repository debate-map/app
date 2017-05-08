import {GetData, GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Term} from "./terms/@Term";
import {IsNaN} from "../../Frame/General/Types";
import {CachedTransform} from "../../Frame/V/VCache";

export function GetTerm(id: number) {
	if (id == null || IsNaN(id)) return null;
	return GetData(`terms/${id}`) as Term;
}
export async function GetTermAsync(id: number) {
	return await GetDataAsync(`terms/${id}`) as Term;
}

export function GetTerms(): Term[] {
	let termsMap = GetData(`terms`);
	return CachedTransform("GetTerms", [], termsMap, ()=>termsMap ? termsMap.VValues(true) : []);
	//return CachedTransform("GetTerms", {}, termsMap, ()=>termsMap ? termsMap.VKeys(true).map(id=>GetTerm(parseInt(id))) : []);
}

// "P" stands for "pure" (though really means something like "pure + synchronous")
export function GetFullNameP(term: Term) {
	return term.name + (term.disambiguation ? ` (${term.disambiguation})` : "");
}

export function GetTermVariantNumber(term: Term): number {
	let termsWithSameName_map = GetData(`termNames/${term.name}`);
	if (termsWithSameName_map == null) return 1;
	let termsWithSameNameAndLowerIDs = termsWithSameName_map.VKeys(true).map(a=>a.ToInt()).filter(a=>a < term._id);
	return 1 + termsWithSameNameAndLowerIDs.length;
}