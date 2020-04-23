import {CreateWebpackConfig} from "vwebapp-framework/Scripts/Build/WebpackConfig";
import fs from "fs";
import path from "path";
import {config} from "../Config";
import {npmPatch_replacerConfig} from "./NPMPatches";

/*function resolvePath(...segmentsFromRoot: string[]) {
	//return fs.realpathSync(path.resolve(config.path_base, ...segmentsFromRoot));
	return path.resolve(config.path_base, ...segmentsFromRoot);
}*/

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
	/*tsLoaderPaths: [
		/vwebapp-framework[/\\].*Source[/\\].*\.tsx?$/,
		/js-vextensions[/\\].*Helpers[/\\].*@ApplyCETypes\.tsx?$/,
		// custom
		/@debate-map[/\\]server-link[/\\].*Source[/\\].*\.tsx?$/,
	],*/
	/*tsLoaderPaths: [
		resolvePath("node_modules", "vwebapp-framework", "Source"),
		resolvePath("node_modules", "js-vextensions", "Helpers", "@ApplyCETypes.d.ts"),
		resolvePath("node_modules", "@debate-map", "server-link", "Source"),
	],*/
	/*tsLoaderEntries: [
		{context: resolvePath("node_modules", "vwebapp-framework"), test: /vwebapp-framework[/\\]Source[/\\].*\.tsx?$/},
		//{context: resolvePath("node_modules", "vwebapp-framework"), test: new RegExp(config.path_base.split(path.sep).concat("node_modules", "vwebapp-framework", "Source", ".*\\.tsx?$").join(path.sep))},
		{context: resolvePath("node_modules", "js-vextensions"), test: /js-vextensions[/\\]Helpers[/\\]@ApplyCETypes\.tsx?$/},
		// custom
		{context: resolvePath("node_modules", "@debate-map", "server-link"), test: /@debate-map[/\\]server-link[/\\]Source[/\\].*\.tsx?$/},
	],*/
	tsLoaderEntries: [
		{test: /vwebapp-framework[/\\]Source[/\\].*\.tsx?$/},
		{test: /js-vextensions[/\\]Helpers[/\\]@ApplyCETypes\.tsx?$/},
		// custom
		{test: /@debate-map[/\\]server-link[/\\]Source[/\\].*\.tsx?$/},
	],
});