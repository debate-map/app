import {CreateNPMPatchesConfig} from "web-vcore/Scripts_Dist/Build/NPMPatches.js";

//import {config} from "../../../../.env";
/*import {createRequire} from "module";
const require = createRequire(import.meta.url);
require("dotenv").config({path: "../../../../.env"});*/

export const npmPatch_replacerConfig = CreateNPMPatchesConfig({});
// commented; using config.codeVarReplacements instead
/*npmPatch_replacerConfig.AddRule({
	applyStage: "optimizeChunkAssets",
	replacements: [
		{
			pattern: "process.env.CLIENT_ID",
			replacement: process.env.CLIENT_ID,
		},
	],
});*/