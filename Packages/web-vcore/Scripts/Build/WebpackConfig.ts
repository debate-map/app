import CSSNano from "cssnano";
import debug_base from "debug";
import fs from "fs";
import HtmlWebpackPlugin from "html-webpack-plugin";
import {CE, E} from "js-vextensions";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import {createRequire} from "module";
import pathModule from "path";
import SpriteLoaderPlugin from "svg-sprite-loader/plugin.js";
import {fileURLToPath} from "url";
import webpack from "webpack";
import WebpackStringReplacer from "webpack-string-replacer";
import ModuleDependencyWarning from "webpack/lib/ModuleDependencyWarning.js";
import DuplicatePackageCheckerPlugin from "@cerner/duplicate-package-checker-webpack-plugin";
import _ from "lodash";
import {MakeSoWebpackConfigOutputsStats} from "./WebpackConfig/OutputStats.js";
import type {CreateConfig_ReturnType} from "../Config";
import {DEV, OUTPUT_STATS, PROD, QUICK, USE_TSLOADER} from "../EnvVars/ReadEnvVars.js";

// we could either add a reference from "./Scripts/tsconfig.json" to "./tsconfig.json", or we could use require; doing latter for now
//import wvcPackageJSON from "../../package.json";
const require = createRequire(import.meta.url);
const wvcPackageJSON = require("../../package.json");

declare const {CreateConfig}: typeof import("../Config");
const debug = debug_base("app:webpack:config");

const __dirname = pathModule.dirname(fileURLToPath(import.meta.url));
export function PathFromWebVCoreRoot(...subpathNodes: string[]) {
	return pathModule.join(__dirname, "..", "..", ...subpathNodes);
}
export function FindNodeModule_FromUserProjectRoot(config: CreateConfig_ReturnType, name: string) {
	const paths = config.utils_paths;
	if (fs.existsSync(paths.base("node_modules", name))) {
		return paths.base("node_modules", name);
	}
	// for if in monorepo, check root/hoist node_modules folder
	if (fs.existsSync(paths.base("..", "..", "node_modules", name))) {
		return paths.base("..", "..", "node_modules", name);
	}
	throw new Error(`Cannot find node-module "${name}". FirstCheck: ${paths.base("node_modules", name)}`);
}
export function FindNodeModule_FromWebVCoreRoot(config: CreateConfig_ReturnType, name: string) {
	if (fs.existsSync(PathFromWebVCoreRoot("node_modules", name))) {
		return PathFromWebVCoreRoot("node_modules", name);
	}
	return FindNodeModule_FromUserProjectRoot(config, name);
}

export class TSLoaderEntry {
	//context: string;
	test: webpack.RuleSetCondition;
}
export class CreateWebpackConfig_Options {
	config: CreateConfig_ReturnType;
	npmPatch_replacerConfig: any;
	name: string;

	/** Raw webpack-config field sets/overrides. */
	ext_shallow?: Partial<webpack.Configuration>;
	/** Deep webpack-config merge object. (runs after application of the shallow ext_shallow data) */
	ext_deep?: Partial<webpack.Configuration>;

	// custom options
	sourcesFromRoot? = false;
	//tsLoaderPaths?: webpack.RuleSetConditions;
	//tsLoaderPaths?: string[];
	tsLoaderEntries?: TSLoaderEntry[];
}

export function CreateWebpackConfig(opt: CreateWebpackConfig_Options) {
	opt = E(new CreateWebpackConfig_Options(), opt);

	const paths = opt.config.utils_paths;
	const wvcFolderInfo = fs.existsSync(FindNodeModule_FromUserProjectRoot(opt.config, "web-vcore")) ? fs.lstatSync(FindNodeModule_FromUserProjectRoot(opt.config, "web-vcore")) : null;
	const wvcSymlinked = wvcFolderInfo?.isSymbolicLink() ?? false;
	console.log(`web-vcore running in symlink mode?: ${wvcSymlinked}`);

	function SubdepPath(subPath: string) {
		return FindNodeModule_FromWebVCoreRoot(opt.config, subPath);
	}

	debug("Creating configuration.");
	const webpackConfig = <webpack.Configuration>{
		name: opt.name,
		mode: PROD && !QUICK ? "production" : "development",
		optimization: {
			emitOnErrors: false,

			// use paths as runtime identifiers for webpack modules (easier debugging, and helps webpack-runtime-require)
			moduleIds: "named",

			// The size of dm prod-builds, with various setting combinations: (second size is when gzipped, rounded to multiple of 0.1mb unfortunately; "exports" describes which exports WRR can find)
			// 2024-04-02: Set none:                               3.56mb/992kb [exports: very limited, due to module-merging + export-privatizing]
			// 2024-04-02: Set usedExports:                        3.64mb/1.0mb [exports: very limited, due to module-merging + export-privatizing]
			// 2024-04-02: Set concatenateModules:                 3.89mb/1.0mb [exports: the most important ones, ie. exports referenced from other modules]
			// 2024-04-02: Set usedExports+concatenateModules:     4.04mb/1.1mb [exports: all exports]

			// disable removal/privatizing of unused exports, even in prod (otherwise webpack-runtime-require can't access unused-from-other-module exports)
			usedExports: false,
			// disable concatenation/merging of modules, even in prod (otherwise webpack merges many modules, causing exports between them to be removed/privatized)
			concatenateModules: false,
		},
		target: "web",
		devtool: opt.config.compiler_devtool as any,
		resolve: {
			modules:
				opt.sourcesFromRoot
					? [
						"node_modules", // commented; thus we ignore the closest-to-import-statement node_modules folder, instead we: [...]
						// paths.base('node_modules'), // [...] always get libraries from the root node_modules folder
						// paths.source(),
						//USE_TSLOADER ? paths.source() : paths.sourceJS(),
						!USE_TSLOADER && paths.sourceJS(), // add source-js folder first, so it has priority
						paths.base(),
					].filter(a=>a)
					: [
						"node_modules", // commented; thus we ignore the closest-to-import-statement node_modules folder, instead we: [...]
						// paths.base('node_modules'), // [...] always get libraries from the root node_modules folder
						// paths.source(),
						USE_TSLOADER ? paths.source() : paths.base("Source_JS"),
					],
			// extensions: [".js", ".jsx", ".json"].concat(USE_TSLOADER ? [".ts", ".tsx"] : []),
			extensions: [
				".js", ".jsx", ".json",
				".ts", ".tsx", // always accept ts[x], because there might be some in node_modules (eg. web-vcore)
				".mjs", // needed for mobx-sync
			],
			// for nodejs polyfills
			/*fallback: {
				//buffer: require.resolve("buffer/"),
			},*/
		},
		module: {
			rules: [
				// load source-maps (doesn't seem to actually work atm, at least for, eg. js-vextensions lib)
				/*{
					test: /(\.jsx?|\.jsx?\.map)$/,
					use: 'source-map-loader',
					include: [
						// list here the node-modules you want to load the source-maps for
						paths.base('node_modules', 'js-vextensions'),
					],
					enforce: 'pre',
				},*/
				// load fonts/images
				{test: /\.woff(\?.*)?$/, use: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=application/font-woff"},
				{test: /\.woff2(\?.*)?$/, use: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=application/font-woff2"},
				{test: /\.otf(\?.*)?$/, use: "file-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=font/opentype"},
				{test: /\.ttf(\?.*)?$/, use: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=application/octet-stream"},
				{test: /\.eot(\?.*)?$/, use: "file-loader?prefix=fonts/&name=[path][name].[ext]"},
				// {test: /\.svg(\?.*)?$/, use: "url-loader?prefix=fonts/&name=[path][name].[ext]&limit=10000&mimetype=image/svg+xml"},
				{test: /\.(png|jpg)$/, use: "url-loader?limit=8192"},
			],
		},
		externals: {
			// temp; fix for firebase-mock in browser (code-path not actually used, so it's okay)
			fs: "root location", // redirect to some global-variable, eg. window.location
		},
	};

	// entry points
	// ==========

	const APP_ENTRY = opt.sourcesFromRoot
		? (USE_TSLOADER ? paths.source("Main.ts") : paths.sourceJS("Source/Main.js"))
		: (USE_TSLOADER ? paths.source("Main.ts") : paths.sourceJS("Main.js"));

	webpackConfig.entry = {
		app: DEV && opt.config.useHotReloading
			? [APP_ENTRY].concat(`webpack-hot-middleware/client?path=${opt.config.compiler_public_path}__webpack_hmr`)
			: [APP_ENTRY],
	};

	// bundle output
	// ==========

	webpackConfig.output = {
		filename: "[name].js?[hash]", // have js/css files have static names, so google can still display content (even when js file has changed)
		path: paths.dist(),
		publicPath: opt.config.compiler_public_path,
		pathinfo: true, // include comments next to require-funcs saying path
	};

	// fix so that webpack can detect additions/removals of folders/symlinks in the "node_modules" folder, as caused by "yarn install" (as called by "Scripts/zalc2.js" during its operations)
	// ==========

	const potentialYalcFolders = [
		PathFromWebVCoreRoot("../../.yalc"), // in parent project
		//PathFromWebVCoreRoot(".yalc"), // in web-vcore itself
		PathFromWebVCoreRoot("../../node_modules/web-vcore/.yalc"), // in web-vcore itself (targeting the paths under node_modules, since that's what webpack needs to watch to detect yarn-executed folder/symlink additions/removals)
	];
	const packagesThatMayBeYalcLinked = [] as {name: string, path: string}[];
	for (const yalcFolder of potentialYalcFolders) {
		if (!fs.existsSync(yalcFolder)) continue;
		const packagesInYalcFolder = [] as string[];
		for (const folderName of fs.readdirSync(yalcFolder)) {
			if (folderName.startsWith("@")) {
				for (const subfolderName of fs.readdirSync(pathModule.join(yalcFolder, folderName))) {
					packagesInYalcFolder.push(`${folderName}/${subfolderName}`);
				}
			} else {
				packagesInYalcFolder.push(folderName);
			}
		}
		for (const packageName of packagesInYalcFolder) {
			packagesThatMayBeYalcLinked.push({name: packageName, path: pathModule.join(yalcFolder, packageName)});
			//packagesThatMayBeYalcLinked.push({name: packageName, path: pathModule.join(yalcFolder, packageName).replace(/\\/g, "/")});
		}
	}

	console.log("Telling webpack of packages that may be yalc-linked (unmanaged paths):", packagesThatMayBeYalcLinked.map(a=>a.name).join(", "));
	//webpackConfig.snapshot = {unmanagedPaths: packagesThatMayBeYalcLinked.map(a=>a.path)};

	// use the "unmanagedPaths" field didn't work; using managedPaths instead (with a regex matching all *except* the target packages) worked for some reason
	// [webpack 5.91.0 had commit message suggesting it would fix the issue; it seemed to help, though still flaky, relating to errors of "mobx-graphlink/node_modules/updeep" becoming missing from "npm run yalc-[up/down]"]
	const sep = `[\\\\/]`;
	const packagesThatMayBeYalcLinked_asRegexSubstrings = packagesThatMayBeYalcLinked.map(a=>a.name.replace("/", sep)).join("|");
	// based on example at: https://webpack.js.org/configuration/other-options/#managedpaths
	const regexForAllNodeModulesExceptPotentialYalcLinked = new RegExp(`^(.+?${sep}node_modules${sep}(?!(${packagesThatMayBeYalcLinked_asRegexSubstrings}))(@.+?${sep})?.+?)${sep}`);
	webpackConfig.snapshot = {managedPaths: [regexForAllNodeModulesExceptPotentialYalcLinked]};

	// even the usage of the "managedPaths" field above had some flakiness; perhaps the most reliable is to just enable watching on the entire node_modules folder
	// (devs don't recommend this [https://github.com/webpack/webpack/issues/11612#issuecomment-705806843], but it seems at least roughly as reliable as the managedPaths regex approach above) 
	//webpackConfig.snapshot = {managedPaths: []};

	// plugins
	// ==========

	webpackConfig.plugins = [
		// plugin to show any webpack warnings and prevent tests from running
		function() {
			const errors = [] as any[];
			this.hooks.done.tap("ShowWarningsAndStopTests", stats=>{
				if (!stats.compilation.errors.length) return;

				// log each of the warnings
				stats.compilation.errors.forEach(error=>{
					errors.push(error.message || error);
				});

				// Pretend no assets were generated. This prevents the tests from running, making it clear that there were warnings.
				//throw new Error(errors)
			});
		},
		new webpack.DefinePlugin(opt.config.codeVarReplacements),
		new HtmlWebpackPlugin({
			template: opt.config.utils_paths.base("./Source/index.html"),
			hash: false,
			filename: "index.html",
			inject: "body",
			minify: false,
		}),
	];

	// rules
	// ==========

	// javascript transpilation (can also run on typescript->javascript results)
	webpackConfig.module!.rules = [
		{
			test: /\.(jsx?|tsx?)$/,
			// we have babel ignore most node_modules (ie. include them raw), but we tell it to transpile the web-vcore typescript files
			// include: [paths.source(), paths.base("node_modules", "web-vcore")],
			include: [
				paths.source(),
				// fs.realpathSync(paths.base('node_modules', 'web-vcore')),
				//fs.existsSync(PathFromWebVCoreRoot("Source")) ? fs.realpathSync(PathFromWebVCoreRoot("Source")) : null,
				fs.existsSync(PathFromWebVCoreRoot("Dist")) ? fs.realpathSync(PathFromWebVCoreRoot("Dist")) : null,
			].filter(a=>a) as string[],
			loader: SubdepPath("babel-loader"),
			options: {
				presets: [
					[
						SubdepPath("@babel/preset-env"),
						{
							// use loose transpilation when possible (makes debugging easier)
							loose: true,
							// don't transpile async/await in dev-mode (makes debugging easier)
							exclude: DEV ? [
								/*"babel-plugin-transform-async-to-generator",
								"babel-plugin-transform-regenerator",*/
								// can't use absolute paths atm (see: https://github.com/babel/babel/issues/9182)
								/*SubdepPath("@babel/plugin-transform-async-to-generator"),
								SubdepPath("@babel/plugin-transform-regenerator")*/
								"transform-async-to-generator",
								"transform-regenerator",
							] : [],
							// targets: {esmodules: true}, // target es2015
							targets: {node: "6.5"}, // target es2015
						},
					],
					SubdepPath("@babel/preset-react"),
				],
				plugins: [
					SubdepPath("@babel/plugin-proposal-nullish-coalescing-operator"),
					SubdepPath("@babel/plugin-proposal-optional-chaining"),
					// for some reason this is needed now (eg. first noticed for GD repo)
					[
						SubdepPath("@babel/plugin-proposal-class-properties"),
						{
							//loose: true,
							loose: false, // needed for mobx @observable (probably)
						},
					],
					// needed to match with "{loose: false}" for "@babel/plugin-proposal-class-properties"
					[SubdepPath("@babel/plugin-proposal-private-methods"), {loose: false}],
					[SubdepPath("@babel/plugin-proposal-private-property-in-object"), {loose: false}],
					// needed for newer versions of typescript (5.3.3 as of this writing), which generates class static-blocks
					[SubdepPath("@babel/plugin-proposal-class-static-block")],
				],
				// needed for mobx @observable (probably) (requires Babel >= 7.13.0: https://babeljs.io/docs/en/assumptions)
				assumptions: {
					setPublicClassFields: false,
				},
			},
		},
	];

	// for mobx-sync
	webpackConfig.module!.rules.push({test: /\.mjs$/, type: "javascript/auto"});

	// file text-replacements
	// ==========

	webpackConfig.plugins.push(new WebpackStringReplacer(opt.npmPatch_replacerConfig));

	// css loaders
	// ==========

	webpackConfig.plugins.push(new MiniCssExtractPlugin());
	webpackConfig.module!.rules.push({
		test: /\.(sa|sc|c)ss$/,
		// yes, all of these are supposed to be used together
		use: [
			// extracts CSS into a separate file (with a <link> entry then being inserted into index.html, for runtime loading of it)
			MiniCssExtractPlugin.loader,
			// translates CSS into CommonJS
			{
				loader: SubdepPath("css-loader"),
				options: {
					url: false,
					//minimize: false, // cssnano already minifies
				},
			},
			// is this needed? (I mean, I think it applies css minification, but that's not so important for a 13kb-over-CDNed-network file)
			{
				loader: SubdepPath("postcss-loader"),
				options: {
					postcssOptions: {
						plugins: loader=>[
							PROD && CSSNano({
								// it seems this weird wrapper thing is needed, from examining source, but will just comment for now
								/* preset: ()=> ({
									plugins: new Promise(resolve=> {
										resolve({ */
								autoprefixer: {
									add: true,
									remove: true,
									browsers: ["last 2 versions"],
								},
								discardComments: {removeAll: true},
								discardUnused: false,
								mergeIdents: false,
								reduceIdents: false,
								safe: true,
								// sourcemap: true
								/*		});
									}),
								}), */
							}),
						].filter(a=>a),
					},
				},
			},
			// compiles Sass to CSS
			{
				loader: SubdepPath("sass-loader"),
				options: {
					sassOptions: {
						includePaths: [paths.source()],
					},
					additionalData: (content: string, loaderContext)=>{
						// More information about available properties https://webpack.js.org/api/loaders/
						const {resourcePath, rootContext} = loaderContext;
						//const relativePath = path.relative(rootContext, resourcePath);
						console.log(`Sass-loader preprocessing. @resourcePath:${resourcePath}`);
						//console.log(`Content:${content}`);

						//if (resourcePath.includes("node_modules/web-vcore") && resourcePath.endsWith("Main.scss") && wvcSymlinked) {
						/*const startPoint = content.indexOf("// [StartOfWVCMainSCSS]");
						const endPoint = content.includes("// [EndOfWVCMainSCSS]") ? content.indexOf("// [EndOfWVCMainSCSS]") + "// [EndOfWVCMainSCSS]".length : -1;
						// if wvc Main.scss file is part of this content instance, and wvc is symlinked, replace its top-level subdep imports with ones under wvc folder
						if (startPoint != -1 && endPoint != -1 && wvcSymlinked) {
							console.log("Found wvc Main.scss file. Applying fixes, since wvc is symlinked.");
							const wvcPart = content.slice(startPoint, endPoint);
							const wvcPart_fixed = wvcPart.replace(/@import "~/g, "@import \"~web-vcore/node_modules/");
							return content.slice(0, startPoint) + wvcPart_fixed + content.slice(endPoint);
						}*/

						//console.log("Includes uPlot css?:", content.includes(".u-legend th"));

						if (content.includes("web-vcore/Source/Utils/Styles/Entry_Base.scss") && wvcSymlinked) {
							return content.replace(/Styles\/Entry_Base.scss/g, "Styles/Entry_Symlinked.scss");
						}

						return content;
					},
				},
			},
		],
	});

	// finalize configuration
	// ==========

	// fix for not-useful warnings in wepack 5, eg. "export 'XXX' (imported as 'XXX') was not found in 'XXX_common' (module has no exports)"
	// (the exports do in fact exist, they're just stripped by ts-loader by the time webpack looks for it)
	class IgnoreNotFoundExportPlugin {
		apply(compiler) {
			const messageRegExp = /export '.*'( \((imported|reexported) as '.*'\))? was not found in/;
			function doneHook(stats) {
				stats.compilation.warnings = stats.compilation.warnings.filter(warn=>{
					if (warn instanceof ModuleDependencyWarning && messageRegExp.test(warn.message)) return false;
					return true;
				});
			}
			if (compiler.hooks) {
				compiler.hooks.done.tap("IgnoreNotFoundExportPlugin", doneHook);
			} else {
				compiler.plugin("done", doneHook);
			}
		}
	}
	webpackConfig.plugins.push(new IgnoreNotFoundExportPlugin());

	webpackConfig.plugins.push(new SpriteLoaderPlugin());
	webpackConfig.module!.rules.push({
		test: /\.svg$/,
		loader: SubdepPath("svg-sprite-loader"),
		options: {}, // "options" must be present
	});

	if (OUTPUT_STATS) {
		MakeSoWebpackConfigOutputsStats(webpackConfig);
	}

	// this doesn't seem to detect all duplicates btw (still worth having, though should make a bug report at some point)
	webpackConfig.plugins.push(new DuplicatePackageCheckerPlugin({
		// Also show module that is requiring each duplicate package (default: false)
		verbose: true,
		// Emit errors instead of warnings (default: false)
		//emitError: true,
		// Show help message if duplicate packages are found (default: true)
		//showHelp: false,
		// Warn also if major versions differ (default: true)
		//strict: false,
		/**
		 * Exclude instances of packages from the results. 
		 * If all instances of a package are excluded, or all instances except one,
		 * then the package is no longer considered duplicated and won't be emitted as a warning/error.
		 * @param {Object} instance
		 * @param {string} instance.name The name of the package
		 * @param {string} instance.version The version of the package
		 * @param {string} instance.path Absolute path to the package
		 * @param {?string} instance.issuer Absolute path to the module that requested the package
		 * @returns {boolean} true to exclude the instance, false otherwise
		 */
		exclude: instance=>{
			const ignoreList = [
				// definitely seem safe (to have duplicates of)
				"classnames", "fast-json-stable-stringify", "object-assign", "prop-types", "react-is", "symbol-observable", "tslib",
				// probably safe
				"@babel/runtime", "codemirror", "graphql-tag", "lodash",
			];
			return ignoreList.includes(instance.name);
		},
		// Emit errors (regardless of emitError value) when the specified packages are duplicated (default: [])
		alwaysEmitErrorsFor: ["react", "react-router"],
	}));

	// apply parent-project's overrides
	Object.assign(webpackConfig, opt.ext_shallow);
	_.merge(webpackConfig, opt.ext_deep);
	return webpackConfig;
}

// also do this, for if sending to cli-started webpack
//export default webpackConfig;
//module.exports = webpackConfig;