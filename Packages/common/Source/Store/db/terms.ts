import {CachedTransform, IsNaN, emptyArray, emptyArray_forLoading, Assert, CE} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, GetDocs, StoreAccessor, Validate} from "web-vcore/nm/mobx-graphlink.js";
import {Term} from "./terms/@Term.js";
import {GetNodeRevision} from "./nodeRevisions.js";

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
		//queryOps: [new WhereOp("name", "==", name)],
		params: {filter: {name: {equalTo: name}}},
	}, a=>a.terms);
});
export const GetTermsByForm = StoreAccessor(s=>(form: string): Term[]=>{
	Assert(form.toLowerCase() == form, "Form cannot have uppercase characters.");
	return GetDocs({
		//queryOps: [new WhereOp("forms", "array-contains", form)],
		/*params: {
			variablesStr: "$form: String!",
			filterStr: `filter: {forms: {contains: [$form]}}`,
			variables: {form},
		},*/
		params: {filter: {forms: {contains: [form]}}},
	}, a=>a.terms);
});
export const GetTermsAttached = StoreAccessor(s=>(nodeRevisionID: string, emptyForLoading = true): Term[]=>{
	const revision = GetNodeRevision(nodeRevisionID);
	if (revision == null) return emptyArray;
	//const terms = revision.termAttachments?.map(a=>GetTerm(a.id)) ?? emptyArray;
	const terms = revision.termAttachments?.map(attachment=> {
		if (Validate("UUID", attachment.id) != null) return null; // if invalid term-id, don't try to retrieve entry
		return GetDoc({}, a=>a.terms.get(attachment.id));
	}) ?? emptyArray;
	if (emptyForLoading && CE(terms).Any(a=>a === undefined)) return emptyArray_forLoading;
	return terms;
});

// "P" stands for "pure" (though really means something like "pure + synchronous")
export function GetFullNameP(term: Term) {
	return term.name + (term.disambiguation ? ` (${term.disambiguation})` : "");
}

/*export const GetTermVariantNumber = StoreAccessor(s=>(term: Term): number=>{
	const termsWithSameName_map = GetDoc({}, a=>a.termNames.get(term.name));
	if (termsWithSameName_map == null) return 1;
	const termsWithSameNameAndLowerIDs = termsWithSameName_map.VKeys().map(a=>a).filter(a=>a < term.id);
	return 1 + termsWithSameNameAndLowerIDs.length;
});*/