import {CreateWebpackConfig} from "vwebapp-framework/Scripts/Build/WebpackConfig";
import {config} from "../Config";
import {npmPatch_replacerConfig} from "./NPMPatches";

/*export const webpackConfig: webpack.Configuration = {
	...webpackConfig_base,
	name: "client",
};*/

// modify the imported config-base, then return it (that's fine/intended)
export const webpackConfig = CreateWebpackConfig({
	config,
	npmPatch_replacerConfig,
	ext: {
		name: "client",
	},
	//sourcesFromRoot: true,
	tsLoaderPaths: [
		/vwebapp-framework[/\\].*Source[/\\].*\.tsx?$/,
		/js-vextensions[/\\].*Helpers[/\\].*@ApplyCETypes\.tsx?$/,
		// custom
		/@debate-map[/\\]server-link[/\\].*Source[/\\].*\.tsx?$/,
	],
});