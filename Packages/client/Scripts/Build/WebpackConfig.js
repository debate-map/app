import {CreateWebpackConfig, FindNodeModule_FromUserProjectRoot} from "web-vcore/Scripts_Dist/Build/WebpackConfig.js";
import {createRequire} from "module";
import TerserPlugin from "terser-webpack-plugin";
import {QUICK} from "web-vcore/Scripts_Dist/EnvVars/ReadEnvVars.js";
import {config} from "../Config.js";
import {npmPatch_replacerConfig} from "./NPMPatches.js";

const require = createRequire(import.meta.url);

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
	name: "client",
	ext_deep: {
		resolve: {
			fallback: {
				stream: require.resolve("stream-browserify"),
			},
		},
		optimization: {
			minimize: !QUICK,
			mangleExports: false,
			minimizer: [
				new TerserPlugin({
					minify: TerserPlugin.terserMinify,
					terserOptions: {
						keep_classnames: true,
						mangle: {
							reserved: [
								"makeObservable",
								"observer",
							],
						},
					},
				}),
			],
		},
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
		// maybe temp removed
		/*{test: /web-vcore[/\\]Source[/\\].*\.tsx?$/},
		{test: /web-vcore[/\\]nm[/\\].*\.tsx?$/},*/
		{test: /js-vextensions[/\\]Helpers[/\\]@ApplyCETypes\.tsx?$/},
		// custom
		/*{test: /dm_common[/\\]Source[/\\].*\.tsx?$/},
		{test: /Packages[/\\]common[/\\]Source[/\\].*\.tsx?$/},*/
		//{test: /(Packages[/\\]common|dm_common)[/\\]Source[/\\].*\.tsx?$/},
	],
});
/*webpackConfig.resolve.alias["postgraphile"] = FindNodeModule_FromUserProjectRoot(config, "postgraphile");
webpackConfig.resolve.alias["graphile-utils"] = FindNodeModule_FromUserProjectRoot(config, "graphile-utils");*/
// we don't use pg, postgraphile, and graphile-utils from frontend, so resolve to nothing
webpackConfig.resolve.alias["pg"] = false;
webpackConfig.resolve.alias["postgraphile"] = false;
webpackConfig.resolve.alias["graphile-utils"] = false;