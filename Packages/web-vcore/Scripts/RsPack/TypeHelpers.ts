// We use "as const" in rspack.js, so that ctrl+click works for field overrides in the upstream rspack.config.js file.
// However, normally this causes a type error, because the arrays in the "as const" config get marked as readonly. (RspackConfig wants mutable arrays)
// To fix this, we use this type-helper to convert the readonly arrays to mutable arrays inside the config structure.
// Source: https://stackoverflow.com/a/43001581
export type DeepWriteable<T> =
	T extends RegExp ? T :
	T extends Function ? T :
	{
		-readonly [P in keyof T]: DeepWriteable<T[P]>
	};