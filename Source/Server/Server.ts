import * as AJV from "ajv";
import * as AJVKeywords from "ajv-keywords";

export const ajv = AJVKeywords(new AJV());
declare global { const ajv: AJV.Ajv; } G({ajv});

export function AddSchema(schema, name) {
	schema = E({additionalProperties: false}, schema);
	return ajv.addSchema(schema, name);
}
declare global { function AddSchema(schema, name); } G({AddSchema});