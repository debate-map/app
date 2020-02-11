import { IsNaN, emptyArray, emptyArray_forLoading, Assert, CE } from "js-vextensions";
import { GetDoc, GetDocs, StoreAccessor, WhereFilter } from "mobx-firelink";
import { GetNodeRevision } from "./nodeRevisions";
export const GetTerm = StoreAccessor(s => (id) => {
    if (id == null || IsNaN(id))
        return null;
    return GetDoc({}, a => a.terms.get(id));
});
/* export async function GetTermAsync(id: string) {
    return await GetDoc_Async((a) => a.terms.get(id));
} */
export const GetTerms = StoreAccessor(s => () => {
    return GetDocs({}, a => a.terms);
});
export const GetTermsByName = StoreAccessor(s => (name) => {
    return GetDocs({
        filters: [new WhereFilter("name", "==", name)],
    }, a => a.terms);
});
export const GetTermsByForm = StoreAccessor(s => (form) => {
    Assert(form.toLowerCase() == form, "Form cannot have uppercase characters.");
    return GetDocs({
        filters: [new WhereFilter("forms", "array-contains", form)],
    }, a => a.terms);
});
export const GetTermsAttached = StoreAccessor(s => (nodeRevisionID, emptyForLoading = true) => {
    var _a, _b;
    const revision = GetNodeRevision(nodeRevisionID);
    if (revision == null)
        return emptyArray;
    //const terms = revision.termAttachments?.map(a=>GetTerm(a.id)) ?? emptyArray;
    const terms = (_b = (_a = revision.termAttachments) === null || _a === void 0 ? void 0 : _a.map(attachment => GetDoc({}, a => a.terms.get(attachment.id))), (_b !== null && _b !== void 0 ? _b : emptyArray));
    if (emptyForLoading && CE(terms).Any(a => a === undefined))
        return emptyArray_forLoading;
    return terms;
});
// "P" stands for "pure" (though really means something like "pure + synchronous")
export function GetFullNameP(term) {
    return term.name + (term.disambiguation ? ` (${term.disambiguation})` : "");
}
/*export const GetTermVariantNumber = StoreAccessor(s=>(term: Term): number=>{
    const termsWithSameName_map = GetDoc({}, a=>a.termNames.get(term.name));
    if (termsWithSameName_map == null) return 1;
    const termsWithSameNameAndLowerIDs = termsWithSameName_map.VKeys().map(a=>a).filter(a=>a < term._key);
    return 1 + termsWithSameNameAndLowerIDs.length;
});*/ 
