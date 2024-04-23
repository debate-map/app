// we need to export something so that we can use "export * from ..." approach (thus having this file accessed prior to "export MyOverrideFunction" calls)
export const defineProperty_orig = Object.defineProperty;
Object.defineProperty = function(o, p, attributes) {
	let attributes_final = attributes;
	if (o["__EnableExportOverwrites__"]) {
		//const isWebpackExport = Object.keys(attributes).length == 2 && attributes.enumerable == true && attributes.get && attributes.get.toString().match(/return _.+\[key\];/);
		//if (isWebpackExport) {
		// add an empty setter, just so that the export-override calls don't error
		attributes_final = {...attributes, configurable: true};
		//}
	}
	defineProperty_orig.call(this, o, p, attributes_final);

	// when the user module's "export const __DisableExportOverwrites__ = true;" line is hit, we remove this Object.defineProperty patch we recently added
	if (p == "__DisableExportOverwrites__") {
		Object.defineProperty = defineProperty_orig;
	}
} as any;

export const __EnableExportOverwrites__ = true; // by having user module "export *" from here, we end up marking that module with the special key checked for above

export function RestoreOrigDefinePropertyFunc() {
	Object.defineProperty = defineProperty_orig;
}