// @ts-check

import rspack /*, {Configuration}*/ from "@rspack/core";
import path from "path";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);

/**
@typedef {{
	name: string,
	port: number,
	publicPath: string,
	rootDir: string,
	entryFile: string,
	dotEnvFile: string,
	resourceDirs?: string[],
	outputDir?: string,
}} BuildConfigOptions
*/

/**
 * @param {BuildConfigOptions} options
 **/
export const buildConfig = options=>{
	/** @type {Partial<BuildConfigOptions>} */
	const baseOpt = {
		// investigate: does rspack really need a resource-folder specified in four different places?
		// (resolve.roots, resolve.modules, devServer.static, and CopyRspackPlugin.patterns)
		resourceDirs: [
			path.resolve(options.rootDir, "./Resources"),
		],
		outputDir: path.resolve(options.rootDir, "./Dist"),
	};
	/** @type {BuildConfigOptions} */
	const opt = {
		...baseOpt,
		...options,
	};

	// load .env file (these then become available on process.env)
	require("dotenv").config({path: opt.dotEnvFile});

	// read some vars from the environment variables
	const ENV_LONG = process.env.NODE_ENV;
	const ENV = ENV_LONG === "production" ? "prod" : "dev";
	const QUICK = process.env.QUICK == "true";
	const PROD = ENV == "prod";
	const DEV = ENV == "dev";
	const TEST = false; //ENV == "test";

	// Uncomment the jsdoc comment below ONLY when working on the config in this file. (for type-checking)
	// The rest of the time, keep it commented ("// " before it), so that upstream config allows ctrl+click jumping to fields in this base config.
	// /** @type {RspackConfig} */

	const result = /** @type {const} */ ({
		mode: PROD && !QUICK ? "production" : "development",
		target: "web",
		devtool: PROD ? "source-map" : "cheap-source-map",
		experiments: {
			css: true,
		},
		externals: {
			fs: "root location",
			"/Fonts/AdobeNotDef-Regular.otf": "root location",
		},
		entry: {
			app: opt.entryFile,
		},
		output: {
			// add hash for cache-busting (easier than ensuring web-server + cdn caching is set up consistently/correctly)
			//filename: "[name].js?[contenthash]", // commented; doesn't work currently
			filename: "[name].[contenthash].js",
			path: opt.outputDir,
		},
		optimization: {
			moduleIds: "named",
			usedExports: false,
			concatenateModules: false,
			mangleExports: false,
			minimizer: [
				new rspack.SwcJsMinimizerRspackPlugin({
					minimizerOptions: {
						// todo: switch back to this more precisely-tuned mangling, once swc's minifier applies it correctly (it ignores the keep_classnames subfield)
						/*mangle: {
							keep_classnames: true,
							reserved: ["makeObservable", "observer"],
						},*/
						mangle: false,
					},
				}),
				new rspack.LightningCssMinimizerRspackPlugin({}),
			],
		},
		resolve: {
			roots: opt.resourceDirs,
			modules: [
				"node_modules",
				...(opt.resourceDirs ?? []),
				path.resolve(opt.rootDir, "./Source"),
			],
			extensions: [".js", ".jsx", ".json", ".ts", ".tsx", ".mjs"],
			extensionAlias: {
				".js": [".ts", ".js", ".tsx", ".jsx"],
			},
			fallback: {
				fs: path.resolve(opt.rootDir, "../../node_modules/stream-browserify/index.js"),
				stream: path.resolve(opt.rootDir, "../../node_modules/stream-browserify/index.js"),
			},
			tsConfig: {
				configFile: path.resolve(opt.rootDir, "./tsconfig.json"),
				references: [path.resolve(opt.rootDir, "../../tsconfig.base.json")],
			},
		},
		module: {
			rules: [
				{
					test: /\.(ts?|tsx?|.js)$/,
					use: [
						{
							loader: "builtin:swc-loader",
							/**
							 * @type {import('@rspack/core').SwcLoaderOptions}
							 */
							options: {
								jsc: {
									parser: {
										syntax: "typescript",
										decorators: true,
									},
								},
							},
						},
					],
				},
				{
					test: /\.(sa|sc|c)ss$/,
					use: [
						{
							loader: "sass-loader",
							options: {
								// using `modern-compiler` and `sass-embedded` together significantly improve build performance
								api: "modern-compiler",
								implementation: require.resolve("sass-embedded"),

								sassOptions: {
									includePaths: [path.resolve(opt.rootDir, "./Source")],
								},
							},
						},
					],
					type: "css",
				},
				{
					test: /\.woff(\?.*)?$/,
					type: "asset/inline",
				},
				{
					test: /\.woff2(\?.*)?$/,
					type: "asset/inline",
				},
				{
					test: /\.otf(\?.*)?$/,
					type: "asset/resource",
				},
				{
					test: /\.ttf(\?.*)?$/,
					type: "asset/inline",
				},
				{
					test: /\.eot(\?.*)?$/,
					type: "asset/resource",
				},
				{
					test: /\.(png|jpg)$/,
					type: "asset/inline",
				},
				{
					test: /\.svg$/,
					loader: "svg-sprite-loader",
				},
			],
		},
		devServer: {
			devMiddleware: {
				stats: {
					colors: true,
					chunks: false, // only on prod
					chunkModules: false, // only on prod
				},
				writeToDisk: true,
			},
			port: opt.port,
			static: opt.resourceDirs?.map(resourceDir=>({directory: resourceDir})),
			historyApiFallback: {
				index: "index.html",
				verbose: true,
				rewrites: [
					{
						from: new RegExp(`^${opt.publicPath}.*$`),
						to(context) {
							// if requested path has an extension, change the request to ask for the file-name directly (with no in-between path-nodes)
							// (rspack appears to rename/expose resources as "<some id>.<ext>", at least [some of?] those requested from the css)
							if (context.parsedUrl.pathname?.match(/\.[a-z]+$/)) {
								return `/${context.parsedUrl.pathname.split("/").pop()}`;
							}
							return "/index.html";
						},
					},
				],
			},
		},
		plugins: [
			new rspack.HtmlRspackPlugin({
				template: "./Source/index.html",
				filename: "index.html",
				inject: "body",
				publicPath: opt.publicPath,
			}),
			new rspack.ProgressPlugin({}),
			new rspack.DefinePlugin({
				// all compile-time instances of these fields get replaced with constants
				"globalThis.ENV": S(ENV),
				"globalThis.DEV": S(DEV),
				"globalThis.PROD": S(PROD),
				"globalThis.TEST": S(TEST),
				// in the root project, the `globalThis.` part may be left out
				ENV: S(ENV),
				DEV: S(DEV),
				PROD: S(PROD),
				TEST: S(TEST),

				// some libraries (eg. updeep) try to read custom vars from "process.env" directly; rather than set a replacement for each requested subfield, we just hard-set the "process.env" object entirely
				"process.env": {
					// general
					NODE_ENV: S(ENV_LONG), // note: don't use this (prefer the alts above); we only include it in case libraries use it
					// project-specific
					CLIENT_ID: S(process.env.CLIENT_ID), // CLIENT_ID is supplied by the ".env" file (see "dotenv" call above)
				},

				// DON'T EVER USE THESE (use ones above instead -- to be consistent); we only include them in case libraries use them (such as redux)
				// ==========

				NODE_ENV: S(ENV_LONG),
				__DEV__: S(DEV),
				__PROD__: S(PROD),
				__TEST__: S(TEST),
				//"__COVERAGE__": !argv.watch ? S(TEST) : null,
				//"__BASENAME__": S(BASENAME),
			}),
			new rspack.CopyRspackPlugin({
				patterns: opt.resourceDirs?.map(resourceDir=>({
					from: resourceDir,
					to: opt.outputDir,
					globOptions: {
						ignore: ["**/index.html"],
					},
				})) ?? [],
			}),
		],
	});

	// we use the type-cast and type-assertion below to ensure that the structure above is still a valid RspackConfig structure
	// (see comment in TypeHelpers.ts for more info)
	const result_deepWriteable = toDeepWriteable(result);
	/** @type {RspackConfig} */
	// Note: If this type-assertion fails, uncomment the jsdoc comment just above the "const result = ..." line, for localized type-checking.
	const result_typeCheck = result_deepWriteable;

	return result_deepWriteable;
};

// helper functions
// ==========

// alias for stringify; we have to stringify/wrap-with-quotes the global-var names (ie. make them json), because that's what webpack.DefinePlugin expects
function S(obj) {
	return JSON.stringify(obj);
}

/** @type {<T>(input: T)=>DeepWriteable<T>} */
const toDeepWriteable = obj=>{
	return /** @type {any} */ (obj);
};

/*#*
 * NN stands for "non-null".
 * This is a helper function to enable easier modification of deep-paths, which rspack configs may leave null, but we know is non-null.
 * @type {<T>(obj: T)=>NonNullable<T>}
*#/
/*export function NN(obj) {
	if (obj == null) throw new Error(`Project rspack.config.js tried to modify a field that is null in base config.`);
	return obj;
}*/

// type helpers
// ==========

/**
@typedef {import('@rspack/core').Configuration} RspackConfig
*/

/**
@template T
@typedef {import('./TypeHelpers.ts').DeepWriteable<T>} DeepWriteable<T>
*/