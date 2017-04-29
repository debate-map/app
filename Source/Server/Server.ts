import * as AJV from "ajv";
import * as AJVKeywords from "ajv-keywords";

export const ajv = AJVKeywords(new AJV());
G({ajv}); declare global { const ajv: AJV.Ajv; }

export function AddSchema(schema, name) {
	schema = E({additionalProperties: false}, schema);
	return ajv.addSchema(schema, name);
}
G({AddSchema}); declare global { function AddSchema(schema, name); }