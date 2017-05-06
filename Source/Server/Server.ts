import * as AJV from "ajv";
import * as AJVKeywords from "ajv-keywords";

export const ajv = AJVKeywords(new AJV()) as AJV_Extended;
G({ajv}); declare global { const ajv: AJV_Extended; }

G({Schema}); declare global { function Schema(schema); }
export function Schema(schema) {
	schema = E({additionalProperties: false}, schema);
	return schema;
}

G({AddSchema}); declare global { function AddSchema(schema, name: string); }
export function AddSchema(schema, name: string) {
	schema = Schema(schema);
	ajv.removeSchema(name); // for hot-reloading
	return ajv.addSchema(schema, name);
}

type AJV_Extended = AJV.Ajv & {
	//AddSchema(schema, name: string): void;
	FullErrorsText(): string;
};
/*AJV.prototype.AddSchema = function(this: AJV_Extended, schema, name: string) {
	return `${this.errorsText()} (${ToJSON(this.errors)})`;
};*/
AJV.prototype.FullErrorsText = function(this: AJV_Extended) {
	return `${this.errorsText()}

Details: ${ToJSON(this.errors, null, 3)}
`;
};