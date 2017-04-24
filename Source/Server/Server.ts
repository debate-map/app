import AJV from "ajv";

export const ajv = new AJV();
declare global { const ajv: AJV.Ajv; } G({ajv});