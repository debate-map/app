import {CachedTransform, IsNaN, emptyArray, emptyArray_forLoading, Assert} from "js-vextensions";
import {GetDoc, GetDocs, StoreAccessor, WhereFilter} from "mobx-firelink";
import {Term} from "./terms/@Term";
import {GetNodeRevision} from "./nodeRevisions";

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
export const GetTermsByForm = StoreAccessor(s=>(form: string): Term[]=>{
	Assert(form.toLowerCase() == form, "Form cannot have uppercase characters.");
	return GetDocs({
		filters: [new WhereFilter("forms", "array-contains", form)],
	}, a=>a.terms);
});
export const GetTermsAttached = StoreAccessor(s=>(nodeRevisionID: string, emptyForLoading = true): Term[]=>{
	const revision = GetNodeRevision(nodeRevisionID);
	if (revision == null) return emptyArray;
	//const terms = revision.termAttachments?.map(a=>GetTerm(a.id)) ?? emptyArray;
	const terms = revision.termAttachments?.map(attachment=>GetDoc({undefinedForLoading: true}, a=>a.terms.get(attachment.id))) ?? emptyArray;
	if (emptyForLoading && terms.Any(a=>a === undefined)) return emptyArray_forLoading;
	return terms;
});

// "P" stands for "pure" (though really means something like "pure + synchronous")
export function GetFullNameP(term: Term) {
	return term.name + (term.disambiguation ? ` (${term.disambiguation})` : "");
}

/*export const GetTermVariantNumber = StoreAccessor(s=>(term: Term): number=>{
	const termsWithSameName_map = GetDoc({}, a=>a.termNames.get(term.name));
	if (termsWithSameName_map == null) return 1;
	const termsWithSameNameAndLowerIDs = termsWithSameName_map.VKeys().map(a=>a).filter(a=>a < term._key);
	return 1 + termsWithSameNameAndLowerIDs.length;
});*/