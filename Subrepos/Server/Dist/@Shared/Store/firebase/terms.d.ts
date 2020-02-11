import { Term } from "./terms/@Term";
export declare const GetTerm: ((id: string) => Term) & {
    Wait: (id: string) => Term;
};
export declare const GetTerms: (() => Term[]) & {
    Wait: () => Term[];
};
export declare const GetTermsByName: ((name: string) => Term[]) & {
    Wait: (name: string) => Term[];
};
export declare const GetTermsByForm: ((form: string) => Term[]) & {
    Wait: (form: string) => Term[];
};
export declare const GetTermsAttached: ((nodeRevisionID: string, emptyForLoading?: any) => Term[]) & {
    Wait: (nodeRevisionID: string, emptyForLoading?: any) => Term[];
};
export declare function GetFullNameP(term: Term): string;
