// @ts-check

//import {FindWVCNodeModule} from "web-vcore/Scripts/@CJS/ModuleFinder";
import tseslint from 'typescript-eslint';
import vbase from "eslint-config-vbase";
import {createRequire} from 'module';
import "eslint-plugin-only-warn"; // for this one, simply importing it is enough to activate it

//const require = createRequire(import.meta.url);

export default tseslint.config(
	...vbase,
);