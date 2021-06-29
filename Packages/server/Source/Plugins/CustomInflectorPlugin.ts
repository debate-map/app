import {makeAddInflectorsPlugin} from "graphile-utils";

export const CustomInflectorPlugin = makeAddInflectorsPlugin(inflectors => {
	// Here 'enumName' is dereferenced to 'oldEnumName' from the existing inflectors.
	const old = {...inflectors};

	return {
		/*enumName(value: string) {
			// By the time we get here, `inflectors.enumName` refers to this very
			// method, so we must call `oldEnumName` rather than
			// `inflectors.enumName` otherwise we will get a "Maximum call stack size
			// exceeded" error.

			// Further, we must ensure that the value of `this` is passed through
			// otherwise the old inflector cannot reference other inflectors.

			//return oldEnumName.call(this, value.replace(/\./g, "_"));
			return oldEnumName.call(this, value).replace(/Id/g, "ID");
			//return oldEnumName.call(this, value.replace(/Id/g, "ID"));
		},*/
		// for turning plural into singular
		/*getBaseName(value: string) {
			//return value.replace(/Id/g, "ID");
			console.log("Test1", value);
			return oldGetBaseName.call(this, value)?.replace(/Id/g, "ID");
		},*/
		camelCase(value: string) {
			return old.camelCase(value).replace(/Id/g, "ID");
		},
		upperCamelCase(value: string) {
			return old.upperCamelCase(value).replace(/Id/g, "ID");
		},
	};
}, true);