import CSSNano from "cssnano";
import debug_base from "debug";
// import resolverFactory from 'enhanced-resolve/lib/ResolverFactory';
import SymlinkPlugin from "enhanced-resolve/lib/SymlinkPlugin.js";
import fs from "fs";
import HtmlWebpackPlugin from "html-webpack-plugin";
//import {CE} from "js-vextensions";
//import {CE, E} from "js-vextensions/Source"; // temp; require source, thus ts-node compiles to commonjs (fix for that ts-node doesn't support es2015-modules)
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

// Note: These consolidations are only for webpack/runtime. If you need typescript/compile-time consolidations, adds entries to the "paths" field in tsconfig.json.
function GetModuleConsolidations(opt: CreateWebpackConfig_Options) {
	const result = {};

	// these consolidations are done in case web-vcore is symlinked; we don't want web-vcore's dev-dep versions of these being used over the user-project's versions
	const depsToConsolidate_fromParent = CE(wvcPackageJSON.peerDependencies).VKeys(); // eg: mobx-firelink, firebase-feedback, firebase-forum
	for (const name of depsToConsolidate_fromParent) {
		try {
			result[name] = FindNodeModule_FromUserProjectRoot(opt.config, name);
		} catch {
			// if couldn't find node-module, just ignore entry (to match with old behavior; the alias stuff needs a general cleanup)
		}
	}

	// these consolidations are done for a variety of reasons (see notes below)
	const depsToConsolidate_fromWVCFirst = [
		// standard/long-term (ie. under "/nm" folder) consolidations provided by web-vcore (there's a risk of issues either way, but the risk of consolidation is lower than the risk of multiple versions)
		// ==========

		// written by others
		...[
			"react", // doesn't like multiple
			"react-dom", // doesn't like multiple
			"mobx", // doesn't like multiple
			"mobx-react", // doesn't like multiple
		],
		// written by self (separate category, because consolidations for these should always be fine/good,since we know the different versions will be compatible anyway -- or at least easily modifiable to be so)
		...[
			"js-vextensions", // js (base)
			"react-vextensions", "react-vcomponents", "react-vmenu", "react-vmessagebox", "react-vscrollview", "react-vmarkdown", // +react
			"graphql-forum", // +graphql
			"mobx-graphlink", // +mobx
			"web-vcore", // +framework
			"webpack-runtime-require", // misc
		],

		// specialized/temporary consolidations
		// ==========

		...[
			// necessary consolidations, to fix issues
			//"mobx-firelink/node_modules/mobx": paths.base("node_modules", "mobx"), // fsr, needed to prevent 2nd mobx, when mobx-firelink is npm-linked [has this always been true?]

			// convenience consolidations, since they have npm-patches applied (and we don't want to have to adjust the match-counts)
			//"react-beautiful-dnd",
			//"@hello-pangea/dnd",
			"immer",
		],
	];
	for (const name of depsToConsolidate_fromWVCFirst) {
		try {
			//result[name] = FindNodeModule_FromUserProjectRoot(opt.config, name);
			result[name] = FindNodeModule_FromWebVCoreRoot(opt.config, name);

			// cause an error to occur if the parent project tried importing from the web-vcore ".yalc" folder directly (it should never do this)
			// todo: replace with eslint rule
			result[`web-vcore/.yalc/${name}`] = "never_import_from_the_yalc_folder_directly";
		} catch {
			// if couldn't find node-module, just ignore entry (to match with old behavior; the alias stuff needs a general cleanup)
		}
	}

	console.log("Found aliases/consolidations for:", Object.keys(result).filter(a=>!a.includes("/.yalc/")));

	return result;
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
			alias: GetModuleConsolidations(opt),
			// for nodejs polyfills
			/*fallback: {
				//buffer: require.resolve("buffer/"),
			},*/
		},
		module: {
			rules: [
				// load source-maps (doesn't seem to actually work atm, at least for, eg. js-vextensions lib)
				/* {
					test: /(\.jsx?|\.jsx?\.map)$/,
					use: 'source-map-loader',
					include: [
						// list here the node-modules you want to load the source-maps for
						paths.base('node_modules', 'js-vextensions'),
					],
					enforce: 'pre',
				}, */
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

	// fix for symlinks
	// ==========

	/*
	Pros of disabling symlink-resolution:
	1) Principle: behavior should be the same whether a module is symlinked or not.
	2) Specific reason: [I forget what it was]
	Cons:
	1) It made-so webpack-dev-server wasn't actually updating/reacting-to-changes-in symlinked-deps' output files. (maybe solvable, but I don't know how)
	2) It makes-so webpack doesn't detect "duplicates", eg. "nm/mobx-graphlink" and "nm/graphql-feedback/nm/mobx-graphlink" are both part of bundle [by default] when graphql-feedback is symlinked.
	3) It substantially reduced incremental-compilation performance. I'd estimate it slowed recompiles (from save to page-loaded) from ~5s to ~10s.
	The cons outweigh the pros at the moment, thus I'm re-enabling symlink-resolution for now.
	*/
	/*webpackConfig.resolve.symlinks = false;
	// not sure if this is needed (given flag-set above), but keeping, since it apparently does still get called once
	SymlinkPlugin.prototype.apply = function() {
		console.log("Symlink-plugin disabled...");
	};*/

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

		// speeds up (non-incremental) builds by quite a lot // disabled atm, since causes webpack crash after every 30 or so rebuilds!
		/* new HardSourceWebpackPlugin({
			configHash: function(webpackConfig) {
				const setIn = require("lodash/fp/set");
				let indexOfStringReplaceRule = webpackConfig.module.rules.findIndex(a=>a.loader && a.loader.includes && a.loader.includes("string-replace-webpack-plugin\\loader.js?id="));
				let config_excludeVolatiles = webpackConfig;
				//config_excludeVolatiles = WithDeepSet(config_excludeVolatiles, ["module", "rules", indexOfStringReplaceRule, "loader"], null);
				config_excludeVolatiles = setIn(`module.rules.${indexOfStringReplaceRule}.loader`, null, config_excludeVolatiles);
				return require("node-object-hash")({sort: false}).hash(config_excludeVolatiles);
			},
			// if all caches combined are over the size-threshold (in bytes), then any caches older than max-age (in ms) are deleted
			/*cachePrune: {
				maxAge: 2 * 24 * 60 * 60 * 1000,
				sizeThreshold: 50 * 1024 * 1024
			},*#/
		}), */
	];

	/* if (DEV) {
		debug('Enable plugins for live development (HMR, NoErrors).');
		webpackConfig.plugins.push(
			new webpack.HotModuleReplacementPlugin(),
			new webpack.NoEmitOnErrorsPlugin(),
			// new webpack.NamedModulesPlugin()
		);
	} else  if (PROD && !QUICK) {
		debug('Enable plugins for production (OccurenceOrder, Dedupe & UglifyJS).');
		webpackConfig.plugins.push(
			// new webpack.optimize.OccurrenceOrderPlugin(),
			// new webpack.optimize.DedupePlugin(),
			new webpack.optimize.UglifyJsPlugin({
				compress: {
					unused: true,
					dead_code: true,
					warnings: false,
					keep_fnames: true,
				},
				mangle: {
					keep_fnames: true,
				},
				sourceMap: true,
			}),
		);
	} */

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

	// for using ts-loader to compile the main Source folder files
	/* if (USE_TSLOADER) {
		//webpackConfig.module.rules.push({test: /\.tsx?$/, use: "awesome-typescript-loader"});
		webpackConfig.module.rules.push({test: /\.tsx?$/, loader: "ts-loader", options: {include: [paths.source()]}});
	}*/

	// for using ts-loader to compile ts files in various locations outside of Source (eg. in node_modules)
	/*function resolvePath(...segmentsFromRoot: string[]) {
		//return fs.realpathSync(paths.base(...segmentsFromRoot));
		return paths.base(...segmentsFromRoot);
	}
	const tsLoaderEntries_base = [
		{context: resolvePath("node_modules", "web-vcore"), test: /web-vcore[/\\]Source[/\\].*\.tsx?$/},
		{context: resolvePath("node_modules", "js-vextensions"), test: /js-vextensions[/\\]Helpers[/\\]@ApplyCETypes\.tsx?$/},
	];*/
	const tsLoaderEntries_base = [
		/*{test: /web-vcore[/\\]Source[/\\].*\.tsx?$/},
		{test: /web-vcore[/\\]nm[/\\].*\.tsx?$/}, // some of the "nm/X" files use typescript tricks to fix issues, so use ts-loader for them*/
		{test: /js-vextensions[/\\]Helpers[/\\]@ApplyCETypes\.d\.ts$/},
	];
	const tsLoaderEntries = opt.tsLoaderEntries ?? tsLoaderEntries_base;

	// to reliably run ts-loader on node_modules folders, each must use a separate ts-loader instance
	// (else it [sometimes] "finds" the tsconfig.json in one, and complains when the other packages' files aren't under its rootDir)
	for (const [index, entry] of tsLoaderEntries.entries()) {
		webpackConfig.module!.rules.push({
			// ensures that ts-loader ignores files outside of the path (not needed atm)
			//include: entry.context,
			test: entry.test,
			loader: SubdepPath("ts-loader"),
			options: {
				allowTsInNodeModules: true,
				// forces separate ts-loader instance
				instance: `tsLoader_instance${index}`,
				// ensures that ts-loader finds the correct context and config-file for the path (not needed atm)
				/*context: entry.context,
				configFile: path.resolve(entry.context, "tsconfig.json"),*/

				//onlyCompileBundledFiles: true,
			},
		});
	}

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
// export default webpackConfig;
// module.exports = webpackConfig;