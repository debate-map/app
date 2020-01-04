import {CachedTransform, IsNaN} from "js-vextensions";
import {GetDoc, GetDocs, StoreAccessor, WhereFilter} from "mobx-firelink";
import {Term} from "./terms/@Term";

export const GetTerm = StoreAccessor(s=>(id: string)=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.terms.get(id));
});
/* export async function GetTermAsync(id: string) {
	return await GetDoc_Async((a) => a.terms.get(id));
} */

export const GetTerms = StoreAccessor(s=>(): Term[]=>{
	return GetDocs({}, a=>a.terms);
});
export const GetTermsByName = StoreAccessor(s=>(name: string): Term[]=>{
	return GetDocs({
		filters: [new WhereFilter("name", "==", name)],
	}, a=>a.terms);
});

// "P" stands for "pure" (though really means something like "pure + synchronous")
export function GetFullNameP(term: Term) {
	return term.name + (term.disambiguation ? ` (${term.disambiguation})` : "");
}

export const GetTermVariantNumber = StoreAccessor(s=>(term: Term): number=>{
	const termsWithSameName_map = GetDoc({}, a=>a.termNames.get(term.name));
	if (termsWithSameName_map == null) return 1;
	const termsWithSameNameAndLowerIDs = termsWithSameName_map.VKeys().map(a=>a).filter(a=>a < term._key);
	return 1 + termsWithSameNameAndLowerIDs.length;
});