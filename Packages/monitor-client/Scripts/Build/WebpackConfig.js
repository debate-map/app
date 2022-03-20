import {CreateWebpackConfig, FindNodeModule_FromUserProjectRoot} from "web-vcore/Scripts_Dist/Build/WebpackConfig.js";
import {createRequire} from "module";
import {config} from "../Config.js";
import {npmPatch_replacerConfig} from "./NPMPatches.js";

const require = createRequire(import.meta.url);

// modify the imported config-base, then return it (that's fine/intended)
export const webpackConfig = CreateWebpackConfig({
	config,
	npmPatch_replacerConfig,
	ext_deep: {
		name: "client",
		resolve: {
			fallback: {
				stream: require.resolve("stream-browserify"),
			},
		},
	},
	tsLoaderEntries: [
		{test: /js-vextensions[/\\]Helpers[/\\]@ApplyCETypes\.tsx?$/},
	],
});
// we don't use pg, postgraphile, and graphile-utils from frontend, so resolve to nothing
webpackConfig.resolve.alias["pg"] = false;
webpackConfig.resolve.alias["postgraphile"] = false;
webpackConfig.resolve.alias["graphile-utils"] = false;