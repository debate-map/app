import {CreateWebpackConfig, FindNodeModule_FromUserProjectRoot} from "web-vcore/Scripts_Dist/Build/WebpackConfig.js";
import {createRequire} from "module";
import HtmlWebpackPlugin from "html-webpack-plugin";
import {config} from "../Config.js";
import {npmPatch_replacerConfig} from "./NPMPatches.js";

const require = createRequire(import.meta.url);

// modify the imported config-base, then return it (that's fine/intended)
export const webpackConfig = CreateWebpackConfig({
	config,
	npmPatch_replacerConfig,
	name: "monitor-client",
	ext_deep: {
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

// temp (till url-rewriter is active); fix that Dist/index.html is trying to load "/app.js" rather than "/monitor/app.js"
const htmlPlugin /** @type {import("html-webpack-plugin").HtmlWebpackPlugin} */ = webpackConfig.plugins.find(a=>a.constructor.name == "HtmlWebpackPlugin");
htmlPlugin.userOptions.publicPath = "/monitor/"; // in newer versions, this should modify "htmlPlugin.options.publicPath"