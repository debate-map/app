import AJV from "ajv";
import AJVKeywords from "ajv-keywords";

export const ajv = AJVKeywords(new AJV());
declare global { const ajv: AJV.Ajv; } G({ajv});