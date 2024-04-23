/*// this is a special case, where supplying .js version is important (needed for callers that use neither webpack nor ts-node)
/*#* @type {typeof import("js-vextensions/Helpers/@ApplyCETypes")} *#/
export const jsve_typeHelper = null;*/

export type __ = typeof import("js-vextensions/Helpers/@ApplyCETypes");
import "js-vextensions/Helpers/@ApplyCECode.js"; // eslint-disable-line