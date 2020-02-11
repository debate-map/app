import { GetValues_ForSchema, CE } from "js-vextensions";
import { AddSchema } from "mobx-firelink";
export class Term {
    constructor(initialData) {
        CE(this).VSet(initialData);
        // this.createdAt = Date.now();
    }
}
// export const termNameFormat = "^[^.#$\\[\\]]+$";
export const Term_nameFormat = '^[a-zA-Z0-9 ,\'"%-]+$';
export const Term_formsEntryFormat = "^[^A-Z]+$";
export const Term_disambiguationFormat = '^[a-zA-Z0-9 ,\'"%-\\/]+$';
// export const Term_shortDescriptionFormat = "^[a-zA-Z ()[],;.!?-+*/]+$";
//export const Term_definitionFormat = "^.+$";
export const Term_definitionFormat = "^(.|\n)+$";
AddSchema("Term", {
    properties: {
        name: { type: "string", pattern: Term_nameFormat },
        disambiguation: { type: "string", pattern: Term_disambiguationFormat },
        type: { $ref: "TermType" },
        forms: { items: { type: "string", pattern: Term_formsEntryFormat }, minItems: 1, uniqueItems: true },
        definition: { type: "string", pattern: Term_definitionFormat },
        note: { type: "string" },
        creator: { type: "string" },
        createdAt: { type: "number" },
    },
    required: ["name", "forms", "type", "definition", /* "components", */ "creator", "createdAt"],
});
export var TermType;
(function (TermType) {
    TermType[TermType["CommonNoun"] = 10] = "CommonNoun";
    TermType[TermType["ProperNoun"] = 20] = "ProperNoun";
    TermType[TermType["Adjective"] = 30] = "Adjective";
    TermType[TermType["Verb"] = 40] = "Verb";
    TermType[TermType["Adverb"] = 50] = "Adverb";
})(TermType || (TermType = {}));
AddSchema("TermType", { oneOf: GetValues_ForSchema(TermType) });
/*export type TermComponentSet = ObservableMap<string, boolean>;
AddSchema("TermComponentSet", {patternProperties: {[UUID_regex]: {type: "boolean"}}});*/ 
