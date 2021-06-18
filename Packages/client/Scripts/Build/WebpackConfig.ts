import {CreateWebpackConfig} from "web-vcore/Scripts/Build/WebpackConfig";
import {config} from "../Config";
import {npmPatch_replacerConfig} from "./NPMPatches";
import JsonpTemplatePlugin from "web-vcore/node_modules/webpack/lib/web/JsonpTemplatePlugin";

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
		/web-vcore[/\\].*Source[/\\].*\.tsx?$/,
		/js-vextensions[/\\].*Helpers[/\\].*@ApplyCETypes\.tsx?$/,
		// custom
		/@debate-map[/\\]server-link[/\\].*Source[/\\].*\.tsx?$/,
	],*/
	/*tsLoaderPaths: [
		resolvePath("node_modules", "web-vcore", "Source"),
		resolvePath("node_modules", "js-vextensions", "Helpers", "@ApplyCETypes.d.ts"),
		resolvePath("node_modules", "@debate-map", "server-link", "Source"),
	],*/
	/*tsLoaderEntries: [
		{context: resolvePath("node_modules", "web-vcore"), test: /web-vcore[/\\]Source[/\\].*\.tsx?$/},
		//{context: resolvePath("node_modules", "web-vcore"), test: new RegExp(config.path_base.split(path.sep).concat("node_modules", "web-vcore", "Source", ".*\\.tsx?$").join(path.sep))},
		{context: resolvePath("node_modules", "js-vextensions"), test: /js-vextensions[/\\]Helpers[/\\]@ApplyCETypes\.tsx?$/},
		// custom
		{context: resolvePath("node_modules", "@debate-map", "server-link"), test: /@debate-map[/\\]server-link[/\\]Source[/\\].*\.tsx?$/},
	],*/
	tsLoaderEntries: [
		// maybe temp removed (was to fix webpack compile errors in web-vcore ts files)
		{test: /web-vcore[/\\]Source[/\\].*\.tsx?$/},
		{test: /web-vcore[/\\]nm[/\\].*\.tsx?$/},
		{test: /js-vextensions[/\\]Helpers[/\\]@ApplyCETypes\.tsx?$/},
		// custom
		{test: /dm_common[/\\]Source[/\\].*\.tsx?$/},
		//{test: /@debate-map[/\\]server-link[/\\]Source[/\\].*\.tsx?$/},
	],
});