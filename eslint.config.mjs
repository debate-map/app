// @ts-check

//import {FindWVCNodeModule} from "web-vcore/Scripts/@CJS/ModuleFinder";
import tseslint from "typescript-eslint";
import vbase from "eslint-config-vbase";
import "eslint-plugin-only-warn"; // for this one, simply importing it is enough to activate it

//import {createRequire} from "module";
//const require = createRequire(import.meta.url);

export default tseslint.config(
	...vbase,
	{
		rules: {
			// disabled in this repo, since `{}` is convenient to use as the Response type for quite a few Command classes
			//"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-empty-object-type": ["warn", {"allowObjectTypes": "always"}],
		},
	},
);